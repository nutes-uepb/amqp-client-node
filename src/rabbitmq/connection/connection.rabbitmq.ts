import { Connection, Queue } from '../infrastructure/amqp-ts'
import { IConnectionEventBus } from '../port/connection.event.bus.interface'
import { IOptions } from '../port/configuration.inteface'

import { ConnectionFactoryRabbitMQ } from './connection.factory.rabbitmq'
import { CustomLogger, ILogger } from '../../utils/custom.logger'

/**
 * Implementation of the interface that provides conn with RabbitMQ.
 * To implement the RabbitMQ abstraction the amqp-ts library was used.
 *
 * @see {@link https://github.com/abreits/amqp-ts} for more details.
 * @implements {IConnectionEventBus}
 */
export abstract class ConnectionRabbitMQ implements IConnectionEventBus {

    protected static idConnection: string
    protected _connection?: Connection
    protected readonly _logger: ILogger = new CustomLogger()

    get isConnected(): boolean {
        if (!this._connection) return false
        return this._connection.isConnected
    }

    get conn(): Connection | undefined {
        return this._connection
    }

    /**
     * Routine to connect to RabbitMQ.
     * When there is no connection to RabbitMQ, new attempts
     * are made to connect according to the parameter {@link _options}
     * which sets the total number of retries and the delay
     *
     * @return Promise<void>
     * @param host
     * @param port
     * @param username
     * @param password
     * @param options
     */
    public tryConnect(vhost: string,
                      host: string,
                      port: number,
                      username: string,
                      password: string,
                      options ?: IOptions): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            if (this.isConnected) return resolve(this._connection)

            new ConnectionFactoryRabbitMQ(vhost, host, port, username, password, options)
                .createConnection()
                .then((connection: Connection) => {
                    this._connection = connection

                    this._connection.on('error_connection', (err: Error) => {
                        this._logger.error('Error during connection ')
                    })

                    this._connection.on('close_connection', () => {
                        this._logger.info('Close connection with success! ')
                    })

                    this._connection.on('open_connection', () => {
                        this._logger.info('Connection established.')
                    })

                    this._connection.on('lost_connection', () => {
                        this._logger.warn('Lost connection ')
                    })

                    this._connection.on('trying_connect', () => {
                        this._logger.warn('Trying re-established connection')
                    })

                    this._connection.on('re_established_connection', () => {
                        this._logger.warn('Re-established connection')
                    })

                    return resolve(this._connection)
                })
                .catch(err => {

                    switch (err.code) {
                        case 'ENOTFOUND' || 'SELF_SIGNED_CERT_IN_CHAIN' || 'ECONNREFUSED':
                            this._logger.error('Error during the connection. Error code: ' + err.code)
                            break
                        case '...':
                            this._logger.warn('Error during the connection Error code: ' + err.code)
                            break
                        default:
                            this._logger.error('No mapped e error during the connection')
                            break
                    }

                    return reject(err)
                })
        })
    }

    public closeConnection(): Promise<boolean> {

        return new Promise<boolean | undefined>(async (resolve, reject) => {
            if (this.isConnected) {
                this._connection.close().then(() => {
                    return resolve(true)
                }).catch(err => {
                    return reject(err)
                })
            } else
                return resolve(false)
        })
    }

    public logger(enabled: boolean,
                  level?: string): void {
        this._logger.changeLoggerConfiguration(enabled, level)
        return
    }

}
