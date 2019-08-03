import { IBusConnection } from '../../port/connection/connection.interface'
import { IConnectionOptions, IConnectionParams } from '../../../application/port/connection.config.inteface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { IConnectionFactory } from '../../port/connection/connection.factory.interface'
import { ICustomLogger } from '../../../utils/custom.logger'

import { ConnectionFactoryRabbitMQ } from './connection.factory.rabbitmq'
import { Queue } from '../bus/queue'
import { Exchange } from '../bus/exchange'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { IExchangeOptions } from '../../../application/port/exchange.option.interface'
import { IQueueOptions } from '../../../application/port/queue.option.interface'

const defaultOptions: IConnectionOptions = {
    retries: 0,
    interval: 1000
}

const defaultParams: IConnectionParams = {
    protocol: 'amqp',
    hostname: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 0,
    vhost: ''
}

/**
 * Implementation of the interface that provides conn with RabbitMQ.
 * To implement the RabbitMQ abstraction the amqp-ts library was used.
 *
 * @see {@link https://github.com/abreits/amqp-ts} for more details.
 * @implements {IBusConnection}
 */
@injectable()
export class ConnectionRabbitMQ implements IBusConnection {

    private _idConnection: string
    private _connection?: ConnectionFactoryRabbitMQ
    private _configuration: IConnectionParams | string
    private _options: IConnectionOptions

    private _resourceBus: Map<string, Queue | Exchange>

    constructor(@inject(Identifier.RABBITMQ_CONNECTION_FACT) private readonly _connectionFactory: IConnectionFactory,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
        this._resourceBus = new Map<string, Queue | Exchange>()
    }

    set configurations(config: IConnectionParams | string) {
        this._configuration = config

        if (typeof config === 'object') {
            for (const key of Object.keys(config)) {
                if (!config[key]) this.configurations[key] = defaultParams[key]
            }
        }
    }

    set options(value: IConnectionOptions) {
        this._options = value
        if (!this._options) {
            this._options = defaultOptions
        }
    }

    set idConnection(idConnection) {
        this._idConnection = idConnection
    }

    get idConnection(): string {
        return this._idConnection
    }

    get isConnected(): boolean {
        if (!this._connection) return false
        return this._connection.isConnected
    }

    get conn(): ConnectionFactoryRabbitMQ | undefined {
        return this._connection
    }

    /**
     * Routine to open to RabbitMQ.
     * When there is no connection to RabbitMQ, new attempts
     * are made to open according to the parameter {@link _options}
     * which sets the total number of retries and the delay
     *
     * @return Promise<void>
     */
    public connect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.isConnected) return resolve()

            this._connectionFactory
                .createConnection(this._configuration, this._options.sslOptions,
                    {
                        retries: this._options.retries,
                        interval: this._options.interval
                    })
                .then(async (connection: ConnectionFactoryRabbitMQ) => {
                    this._connection = connection
                    this._connection.on('error_connection', (err: Error) => {
                        this._logger.error('Error during connection ')
                        this._emitter.emit('error_connection', err)
                    })

                    this._connection.on('close_connection', () => {
                        this._logger.info('Close connection with success! ')
                        this._emitter.emit('close_connection')
                    })

                    this._connection.on('open_connection', () => {
                        this._logger.info('Connection established.')
                        this._emitter.emit('connected')
                    })

                    this._connection.on('lost_connection', () => {
                        this._logger.warn('Lost connection ')
                        this._emitter.emit('disconnected')
                    })

                    this._connection.on('trying_connect', () => {
                        this._logger.warn('Trying re-established connection')
                        this._emitter.emit('trying_connect')
                    })

                    this._connection.on('re_established_connection', () => {
                        this._logger.warn('Re-established connection')
                        this._emitter.emit('re_established_connection')
                    })

                    await this._connection.initialized

                    return resolve()
                })
                .catch(err => {
                    return reject(err)
                })
        })
    }

    public getExchange(exchangeName: string,
                       options?: IExchangeOptions): Exchange {

        const exchange = this._connection.declareExchange(exchangeName, options ? options.type : undefined, options)
        if (!this._resourceBus.get(exchangeName)) {
            this._resourceBus.set(exchangeName, exchange)
        }
        return exchange
    }

    public getQueue(queueName: string, option?: IQueueOptions): Queue {

        const queue = this._connection.declareQueue(queueName, option)
        if (!this._resourceBus.get(queueName)) {
            this._resourceBus.set(queueName, queue)
        }
        return queue
    }

    public closeConnection(): Promise<boolean> {

        return new Promise<boolean | undefined>(async (resolve, reject) => {
            if (this.isConnected) {
                this._connection.close().then(() => {
                    return resolve(true)
                }).catch(err => {
                    return reject(err)
                })
            }

            return resolve(false)
        })
    }

    public disposeConnection(): Promise<boolean> {

        return new Promise<boolean | undefined>(async (resolve, reject) => {
            if (this.isConnected) {
                try {
                    for (const resource of this._resourceBus.keys()) {
                        await this._resourceBus.get(resource).delete()
                    }
                    await this.closeConnection()
                    return resolve(true)
                } catch (e) {
                    return reject(e)
                }
            }
            return resolve(false)
        })
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.on(event, listener)
    }

}
