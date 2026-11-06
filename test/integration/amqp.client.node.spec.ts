import { expect } from 'chai'
import { amqpClient } from '../../src/amqp.client'
import { Connection } from '../../src/application/connection'
import { IConnection } from '../../src/application/port/connection.interface'
import { IServerRegister } from '../../src/application/port/server.register.interface'

describe('AMQP CLIENT NODE', () => {
    describe('CONNECTION', () => {
        it('should return an error when unable to connect', (done) => {
            amqpClient
                .createConnection('amqp://test:test@localhost',
                    { retries: 1, interval: 500 })
                .then(() => done(new Error('Didn\'t expect to connect')))
                .catch(e => {
                    done()
                })
        })

        it('should return instance of connection when connecting', () => {
            return amqpClient
                .createConnection('amqp://guest:guest@localhost',
                    { retries: 1, interval: 1000 })
                .then(conn => {
                    expect(conn).to.be.an.instanceof(Connection)
                })
        })
    })

    describe('PUBLISH', () => {
        context('Publish Unsuccessfully', () => {
            let conn: IConnection
            before(async () => {
                conn = await getConnection()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should return error when trying to publish without connection', async () => {
                const noConn = await getConnection()
                await noConn.close()

                return noConn
                    .pub(
                        'test.queue',
                        'test.exchange',
                        'log.info'
                    )
                    .then(() => {
                        expect.fail('should not return promise with no error!')
                    })
                    .catch(err => {
                        expect(err).to.be.an('error')
                    })
            })
        })

        context('Publish Successfully', async () => {
            let conn: IConnection
            before(async () => {
                conn = await getConnection()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })
            it('should return a successful promise to publish using default options', async () => {
                return conn
                    .pub(
                        'test.queue2',
                        'test.exchange2',
                        'log.info'
                    )
                    .catch(e => {
                        expect.fail('should not return error!', e)
                    })
            })
        })
    })

    describe('SUBSCRIBE', () => {
        context('Unsuccessfully', () => {
            it('should return error when trying to subscribe without connection', async () => {
                const conn = await getConnection()
                await conn.close()

                return conn
                    .sub(
                        'test.queue',
                        'test.exchange',
                        'log.info',
                        () => {
                            // not implemented
                        }
                    )
                    .then(() => {
                        expect.fail('should not return promise with no error!')
                    })
                    .catch(e => {
                        expect(e).to.be.an('error')
                    })
            })
        })

        context('Successfully', async () => {
            let conn: IConnection
            before(async () => {
                conn = await getConnection()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should return Promise void to successfully subscribe', async () => {
                return conn
                    .sub(
                        'test.queue',
                        'test.exchange',
                        'log.info',
                        () => {
                            // not implemented
                        }
                    )
                    .catch(e => {
                        expect.fail('should not return error!')
                    })
            })
        })
    })

    describe('RPC SERVER', () => {
        context('Successfully', async () => {
            let conn: IConnection
            before(async () => {
                conn = await getConnection()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should return Promise void when booting server with resources', (done) => {
                const server: IServerRegister = conn.createRpcServer('test.server',
                    'test.server', ['logs.find'])
                server.addResource('logs.find', () => {
                    return {}
                })

                server
                    .start()
                    .then(() => done())
                    .catch(err => done(err))
            })
        })
    })

    describe('RPC CLIENT', () => {
        context('Handler Cleanup and Error Safety', async () => {
            let conn: IConnection
            let server: IServerRegister

            before(async () => {
                conn = await getConnection()
                server = conn.createRpcServer('test.cleanup.queue', 'test.cleanup.exchange', ['logs.find'])
                server.addResource('logs.find', () => {
                    return { test: 'rpc server and client!' }
                })
                await server.start()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should remove handler from _consumer_handlers after successful RPC call', async () => {
                const result = await conn.rpcClient('test.cleanup.exchange', 'logs.find', [])
                expect(result).to.deep.equal({ test: 'rpc server and client!' })

                const exchange: any = await (conn as any)._eventBusConnection.getExchange('test.cleanup.exchange')
                expect(Object.keys(exchange._consumer_handlers).length).to.equal(0)
            })

            it('should remove handler from _consumer_handlers even when RPC response is of type error', () => {
                return new Promise<void>(async (resolve, reject) => {
                    try {
                        const exchange: any = await (conn as any)._eventBusConnection.getExchange('test.cleanup.exchange')
                        const correlationId = 'error-correlation-id-test'
                        let errorReceived: any

                        exchange._consumer_handlers[correlationId] = (err: any) => {
                            errorReceived = err
                        }

                        // Simula entrega de resposta com type === 'error' pelo consumidor da reply-to
                        const rawConsumers = exchange._channel.consumers
                        const consumerCallbacks = rawConsumers instanceof Map
                            ? Array.from(rawConsumers.values())
                            : Object.keys(rawConsumers).map(key => rawConsumers[key])
                        expect(consumerCallbacks.length).to.be.greaterThan(0)

                        consumerCallbacks[0]({
                            content: Buffer.from(JSON.stringify('Simulated RPC Error')),
                            properties: {
                                correlationId,
                                type: 'error',
                                contentType: 'application/json'
                            },
                            fields: {}
                        })

                        expect(errorReceived).to.be.an('error')
                        expect(exchange._consumer_handlers[correlationId]).to.be.undefined
                        resolve()
                    } catch (err) {
                        reject(err)
                    }
                })
            })

            it('should safely ignore RPC responses with unknown correlationId without throwing', async () => {
                const exchange: any = await (conn as any)._eventBusConnection.getExchange('test.cleanup.exchange')
                const rawConsumers = exchange._channel.consumers
                const consumerCallbacks = rawConsumers instanceof Map
                    ? Array.from(rawConsumers.values())
                    : Object.keys(rawConsumers).map(key => rawConsumers[key])

                expect(() => {
                    consumerCallbacks[0]({
                        content: Buffer.from(JSON.stringify({ orphan: true })),
                        properties: {
                            correlationId: 'non-existent-correlation-id',
                            contentType: 'application/json'
                        },
                        fields: {}
                    })
                }).to.not.throw()
            })
        })
    })

    describe('LOGGER', () => {
        it('should have successfully enabled logger', () => {
            amqpClient.logger('info')
        })
    })
})

async function getConnection(): Promise<IConnection> {
    return amqpClient.createConnection(
        'amqp://guest:guest@localhost',
        { retries: 1, interval: 1000 }
    )
}
