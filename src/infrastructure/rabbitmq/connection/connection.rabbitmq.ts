// import { Connection,Queue,Exchange } from '../amqp-ts'
import { IConnection } from '../../port/connection/connection.interface'
import { IConfigurationParameters } from '../../port/configuration.inteface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { IConnectionFactory } from '../../port/connection/connection.factory.interface'
import { ICustomLogger } from '../../../utils/custom.logger'

import { Connection } from './connection'
import { Queue } from '../bus/queue'
import { Exchange } from '../bus/exchange'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'

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
    private _connection?: Connection
    private _configurations: IConfigurationParameters

    private _startingConnection

    constructor(@inject(Identifier.RABBITMQ_CONNECTION_FACT) private readonly _connectionFactory: IConnectionFactory,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter)
    {
        this._startingConnection = false
    }

    get configurations(): IConfigurationParameters {
        return this._configurations
    }

    public setConfigurations(config: IConfigurationParameters): void {
        this._configurations = config
    }

    get startingConnection(): boolean{
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
     */
    public tryConnect(): Promise<Connection> {

        this._startingConnection = true
        return new Promise<Connection>((resolve, reject) => {
            if (this.isConnected) return resolve(this._connection)

            this._connectionFactory
                .createConnection(this._configurations)
                .then(async (connection: Connection) => {
                    this._connection = connection

                    this._connection.on('error_connection', (err: Error) => {
                        this._emitter.emit('erro', err)
                        this._logger.error('Error during connection ')
                    })

                    this._connection.on('close_connection', () => {
                        this._emitter.emit('disconnected')
                        this._logger.info('Close connection with success! ')
                    })

                    this._connection.on('open_connection', () => {
                        this._emitter.emit('connected')
                        this._logger.info('Connection established.')
                    })

                    this._connection.on('lost_connection', () => {
                        this._emitter.emit('lost_connection')
                        this._logger.warn('Lost connection ')
                    })

                    this._connection.on('trying_connect', () => {
                        this._emitter.emit('trying_connection')
                        this._logger.warn('Trying re-established connection')
                    })

                    this._connection.on('re_established_connection', () => {
                        this._emitter.emit('reconnected')
                        this._logger.warn('Re-established connection')
                    })

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
        return this._connection.declareExchange(exchangeName, type, { durable: true })
    }

    public getQueue(queueName: string): Queue {

        return this._connection.declareQueue(queueName, { durable: true, autoDelete: true })
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
