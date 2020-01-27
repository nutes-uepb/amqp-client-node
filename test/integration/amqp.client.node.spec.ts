import { expect } from 'chai'
import { amqpClient } from '../../src/amqp.client'
import { Connection } from '../../src/application/connection'
import { IConnection } from '../../src/application/port/connection.interface'
import { IServerRegister } from '../../src/application/port/server.register.interface'
import { IConnectionParams, IConnectionOptions, ISSLOptions } from '../../src/application/port/connection.config.inteface'
import { readFileSync } from 'fs'

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

        it('should return instance of connection when the parameters are objects of connection', () => {
            const params: IConnectionParams = {
                hostname: '127.0.0.1',
                protocol: 'amqp',
                port: 5672,
                username: 'guest',
                password: 'guest'
            }
            return amqpClient.createConnection(
                params)
               .then(conn => {
                    expect(conn).to.be.an.instanceof(Connection)
                })
        })

        it('should reject connection amqp when requesting on a protocol mqtt', () => { //1883 
            const params: IConnectionParams = {
                hostname: '127.0.0.1',
                protocol: 'mqtt',
                port: 1883,
                username: 'guest',
                password: 'guest'
            }
            const IConOptions: IConnectionOptions = {
                interval: 1000,
                retries: 1
            }
            return amqpClient.createConnection(
                params, IConOptions)
                .then(() => {
                    expect.fail('should not return promise with no error!')
                })
                .catch(err => {
                    expect(err).to.be.an('error')
                })
        })

        it('should reject connection amqp when requesting on a port mqtt', () => { //1883 
            const params: IConnectionParams = {
                hostname: '127.0.0.1',
                protocol: 'amqp',
                port: 1883,
                username: 'guest',
                password: 'guest'
            }
            const IConOptions: IConnectionOptions = {
                interval: 1000,
                retries: 1
            }
            return amqpClient.createConnection(
                params, IConOptions)
                .catch(err => {
                    expect.fail('connection fail on port 1883', err)
                })

        })

        it('should return instance of connection whith security SSL', () => {
            return getConnectionSSL()
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
            before(async () => {
                conn = await getConnection()

                const server: IServerRegister = conn.createRpcServer('test.server',
                    'test.server', ['logs.find'])
                server.addResource('logs.find', () => {
                    return { test: 'rpc server and client!' }
                })
                await server.start()
            })

            after(async () => {
                if (conn) await conn.dispose()
            })

            it('should return Promise with requested resource', (done) => {
                conn
                    .rpcClient('test.server', 'logs.find', [])
                    .then(value => {
                        expect(value).to.deep.equal({ test: 'rpc server and client!' })
                        done()
                    })
                    .catch(done)
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


async function getConnectionSSL(): Promise<IConnection> {

    const sslOptions: ISSLOptions = {
        ca: [readFileSync('.certs/ca.crt')]
    }
    const IconOptions: IConnectionOptions = {
          retries: 2,
          interval: 1000,
          sslOptions }

    const params: IConnectionParams = {
        hostname: '127.0.0.1',
        protocol: 'amqps',
        port: 5671,
        username: 'guest',
        password: 'guest',
        vhost: '/'
    }
    return amqpClient.createConnection(
        params, IconOptions
    )
}