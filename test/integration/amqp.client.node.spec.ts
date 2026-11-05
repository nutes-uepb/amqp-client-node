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
        context('Successfully', async () => {
            let conn: IConnection
            let server: IServerRegister

            before(async () => {
                conn = await getConnection()
                server = conn.createRpcServer('test.rpc.client.queue', 'test.rpc.client.exchange', ['math.sum', 'math.echo'])
                server.addResource('math.sum', (a: number, b: number) => {
                    return { sum: a + b }
                })
                server.addResource('math.echo', (text: string) => {
                    return { echo: text }
                })
                await server.start()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should call RPC server and return expected response with single argument', async () => {
                const result = await conn.rpcClient('test.rpc.client.exchange', 'math.echo', ['hello rpc'])
                expect(result).to.deep.equal({ echo: 'hello rpc' })
            })

            it('should call RPC server and calculate sum with multiple arguments', async () => {
                const result = await conn.rpcClient('test.rpc.client.exchange', 'math.sum', [15, 30])
                expect(result).to.deep.equal({ sum: 45 })
            })

            it('should support legacy envelope format { resource_name, handle } with backward compatibility', async () => {
                // Simula mensagem enviada por cliente antigo com envelope legado
                const legacyExchange: any = await (conn as any)._eventBusConnection.getExchange('test.rpc.client.exchange')
                const legacyPayload = {
                    resource_name: 'math.echo',
                    handle: ['legacy test']
                }

                const result: any = await new Promise((resolve, reject) => {
                    legacyExchange.rpc(legacyPayload, 'math.echo', (err, msg) => {
                        if (err) return reject(err)
                        resolve(msg.content)
                    })
                })

                expect(result).to.deep.equal({ echo: 'legacy test' })
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
