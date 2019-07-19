import { IConnection } from '../../port/connection/connection.interface'
import {
    defaultOptions,
    IConnConfiguration,
    IConnOptions
} from '../../../application/port/connection.configuration.inteface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { IConnectionFactory } from '../../port/connection/connection.factory.interface'
import { ICustomLogger } from '../../../utils/custom.logger'

import { ConnectionFactoryRabbitMQ } from './connection.factory.rabbitmq'
import { Queue } from '../bus/queue'
import { Exchange } from '../bus/exchange'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import * as fs from 'fs'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

/**
 * Implementation of the interface that provides conn with RabbitMQ.
 * To implement the RabbitMQ abstraction the amqp-ts library was used.
 *
 * @see {@link https://github.com/abreits/amqp-ts} for more details.
 * @implements {IConnection}
 */
@injectable()
export class ConnectionRabbitMQ implements IConnection {

    private _idConnection: string
    private _connection?: ConnectionFactoryRabbitMQ
    private _configuration: IConnConfiguration | string
    private _options: IConnOptions

    private _startingConnection

    private _resourceBus: Map<string, Queue | Exchange>

    constructor(@inject(Identifier.RABBITMQ_CONNECTION_FACT) private readonly _connectionFactory: IConnectionFactory,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
        this._startingConnection = false
        this._resourceBus = new Map<string, Queue | Exchange>()
    }

    set configurations(config: IConnConfiguration | string) {
        this._configuration = config
    }

    set options(value: IConnOptions) {
        this._options = value
        if (!this._options) {
            this._options = defaultOptions
        }
    }

    get options(): IConnOptions {
        return this._options
    }

    get startingConnection(): boolean {
        return this._startingConnection
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
     * Routine to connect to RabbitMQ.
     * When there is no connection to RabbitMQ, new attempts
     * are made to connect according to the parameter {@link _options}
     * which sets the total number of retries and the delay
     *
     * @return Promise<void>
     */
    public tryConnect(): Promise<ConnectionFactoryRabbitMQ> {
        return new Promise<ConnectionFactoryRabbitMQ>((resolve, reject) => {
            if (this.isConnected) return resolve(this._connection)

            this._startingConnection = true

            let certAuth = {}

            if (this._options.ssl.enabled) {
                if (!this._options.ssl.ca)
                    return reject(new Error('Paramater ca not found'))
                certAuth = { ca: fs.readFileSync(this._options.ssl.ca) }
            }

            let uri: string = ''

            if (typeof this._configuration === 'object') {
                uri = 'protocol://username:password@host:port/vhost'
                    .replace('protocol', this._options.ssl.enabled ? 'amqps' : 'amqp')
                    .replace('host', this._configuration.host)
                    .replace('port', (this._configuration.port).toString())
                    .replace('vhost', this._configuration.vhost)
                    .replace('username', this._configuration.username)
                    .replace('password', this._configuration.password)
            } else {
                uri = this._configuration
            }

            this._connectionFactory
                .createConnection(uri, certAuth,
                    {
                        retries: this._options.retries,
                        interval: this._options.interval
                    })
                .then(async (connection: ConnectionFactoryRabbitMQ) => {
                    this._connection = connection

                    await this._connection.initialized
                    this._startingConnection = false

                    return resolve(this._connection)
                })
                .catch(err => {
                    return reject(err)
                })
        })
    }

    public getExchange(exchangeName: string, config: ICommunicationConfig): Exchange {
        const exchange = this._connection.declareExchange(exchangeName, config.type, config.exchange)
        if (!this._resourceBus.get(exchangeName)) {
            this._resourceBus.set(exchangeName, exchange)
        }
        return exchange
    }

    public getQueue(queueName: string, config: ICommunicationConfig): Queue {
        const queue = this._connection.declareQueue(queueName, config.queue)
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
            try {
                for (const resource of this._resourceBus.keys()) {
                    await this._resourceBus.get(resource).delete()
                }
                await this.closeConnection()
                return resolve(true)
            } catch (e) {
                console.log(e)
                return reject(e)
            }

        })
    }

}
