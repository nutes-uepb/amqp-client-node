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
        context('Timeout and Handler Cleanup', async () => {
            let conn: IConnection
            let server: IServerRegister

            before(async () => {
                conn = await getConnection()
                server = conn.createRpcServer('test.timeout.queue', 'test.timeout.exchange', ['fast.call', 'slow.call'])
                server.addResource('fast.call', () => {
                    return { ok: true }
                })
                server.addResource('slow.call', () => {
                    // Simula processamento lento de 500ms
                    return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 500))
                })
                await server.start()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should execute fast RPC call and clean up handler after response', async () => {
                const result = await conn.rpcClient('test.timeout.exchange', 'fast.call', [])
                expect(result).to.deep.equal({ ok: true })

                const exchange: any = await (conn as any)._eventBusConnection.getExchange('test.timeout.exchange')
                expect(Object.keys(exchange._consumer_handlers).length).to.equal(0)
            })

            it('should clean up handler from _consumer_handlers when rpcTimeout expires', async () => {
                const exchange: any = await (conn as any)._eventBusConnection.getExchange('test.timeout.exchange')

                try {
                    // Executa chamada com timeout de 100ms em rota lenta (500ms)
                    await conn.rpcClient('test.timeout.exchange', 'slow.call', [], { rpcTimeout: 100 })
                    expect.fail('should have thrown timeout error')
                } catch (err) {
                    expect((err as any).message).to.equal('rpc timed out')
                }

                // Verifica que o handler registrado foi removido da exchange imediatamente após o timeout
                expect(Object.keys(exchange._consumer_handlers).length).to.equal(0)

                // Aguarda a resposta tardia do servidor lento e valida que ela é descartada sem estourar exceção
                await new Promise((resolve) => setTimeout(resolve, 600))
                expect(Object.keys(exchange._consumer_handlers).length).to.equal(0)
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
