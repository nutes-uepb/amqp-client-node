// import { ConnectionFactoryRabbitMQ,Queue,Exchange } from '../amqp-ts'
import { IConnection } from '../../port/connection/connection.interface'
import { IConfigurationParameters } from '../../port/configuration.inteface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { IConnectionFactory } from '../../port/connection/connection.factory.interface'
import { ICustomLogger } from '../../../utils/custom.logger'

import { ConnectionFactoryRabbitMQ } from './connection.factory.rabbitmq'
import { Queue } from '../bus/queue'
import { Exchange } from '../bus/exchange'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import * as fs from 'fs'

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
    private _configuration: IConfigurationParameters

    private _startingConnection

    constructor(@inject(Identifier.RABBITMQ_CONNECTION_FACT) private readonly _connectionFactory: IConnectionFactory,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
        this._startingConnection = false
    }

    get configurations(): IConfigurationParameters {
        return this._configuration
    }

    set setConfigurations(config: IConfigurationParameters) {
        this._configuration = config
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

        this._startingConnection = true
        return new Promise<ConnectionFactoryRabbitMQ>((resolve, reject) => {
            if (this.isConnected) return resolve(this._connection)

            let certAuth = {}

            if (this._configuration.options.ssl.enabled) {
                if (!this._configuration.options.ssl.ca)
                    return Promise.reject(new Error('Paramater ca not found'))
                certAuth = { ca: fs.readFileSync(this._configuration.options.ssl.ca) }
            }

            this._connectionFactory
                .createConnection('protocol://username:password@host:port/vhost'
                        .replace('protocol', this._configuration.options.ssl.enabled ? 'amqps' : 'amqp')
                        .replace('host', this._configuration.host)
                        .replace('port', (this._configuration.port).toString())
                        .replace('vhost', this._configuration.vhost)
                        .replace('username', this._configuration.username)
                        .replace('password', this._configuration.password)
                    ,
                    certAuth,
                    {
                        retries: this._configuration.options.retries,
                        interval: this._configuration.options.interval
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

    public getExchange(exchangeName: string, type: string): Exchange {
        return this._connection.declareExchange(exchangeName, type, this._configuration.options.exchange)
    }

    public getQueue(queueName: string): Queue {

        return this._connection.declareQueue(queueName, this._configuration.options.queue)
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

}
