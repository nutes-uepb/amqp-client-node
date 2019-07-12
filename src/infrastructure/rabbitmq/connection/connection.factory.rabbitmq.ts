/**
 * AmqpSimple.ts - provides a simple interface to read from and write to RabbitMQ amqp exchanges
 * Created by Ab on 17-9-2015.
 *
 * methods and properties starting with '_' signify that the scope of the item should be limited to
 * the inside of the enclosing namespace.
 */

// simplified use of amqp exchanges and queues, wrapper for amqplib

import { Binding } from '../bus/binding'
import { Queue } from '../bus/queue'
import { Exchange } from '../bus/exchange'

import * as AmqpLib from 'amqplib/callback_api'
import { createLogger, format, transports } from 'winston'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { IConnectionFactory, IReconnectStrategy, ITopology } from '../../port/connection/connection.factory.interface'
import { IExchangeDeclarationOptions } from '../../port/bus/exchange.options.interface'
import { IQueueDeclarationOptions } from '../../port/bus/queue.options.interface'

// create a custom winston logger for amqp-ts
const amqp_log = createLogger({
    level: 'silly', // Used by transports that do not have this configuration defined
    silent: false,
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: new transports.Console(this._options),
    exitOnError: false
})
export const log = amqp_log

// ----------------------------------------------------------------------------------------------------
// ConnectionFactoryRabbitMQ class
// ----------------------------------------------------------------------------------------------------
@injectable()
export class ConnectionFactoryRabbitMQ implements IConnectionFactory {
    public initialized: Promise<void>
    public isConnected: boolean = false

    private url: string
    private socketOptions: any
    private reconnectStrategy: IReconnectStrategy
    private connectedBefore = false

    private _connection: AmqpLib.Connection
    private _retry: number
    private _rebuilding: boolean = false
    private _isClosing: boolean = false

    private _exchanges: { [id: string]: Exchange }
    private _queues: { [id: string]: Queue }
    private _bindings: { [id: string]: Binding }

    constructor(@inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    /**
     * Create instance of {@link Connection} Class belonging
     * to the amqp-ts library to connect to RabbitMQ.
     *
     * @return Promise<Connection>
     * @param url
     * @param socketOptions
     * @param reconnectStrategy
     */
    public async createConnection(url = 'amqp://localhost',
                                  socketOptions: any = {},
                                  reconnectStrategy: IReconnectStrategy = {
                                      retries: 0,
                                      interval: 1500
                                  }): Promise<ConnectionFactoryRabbitMQ> {
        this.url = url
        this.socketOptions = socketOptions
        this.reconnectStrategy = reconnectStrategy
        this._exchanges = {}
        this._queues = {}
        this._bindings = {}

        this.rebuildConnection()

        return Promise.resolve(this)
    }

    private rebuildConnection(): Promise<void> {
        if (this._rebuilding) { // only one rebuild process can be active at any time
            log.log('debug', 'ConnectionFactoryRabbitMQ rebuild already in progress, ' +
                'joining active rebuild attempt.', { module: 'amqp-ts' })
            return this.initialized
        }
        this._retry = -1
        this._rebuilding = true
        this._isClosing = false

        // rebuild the connection
        this.initialized = new Promise<void>((resolve, reject) => {
            this.tryToConnect(this, 0, (err) => {
                /* istanbul ignore if */
                if (err) {
                    this._rebuilding = false
                    reject(err)
                } else {
                    this._rebuilding = false
                    if (this.connectedBefore) {
                        log.log('warn', 'ConnectionFactoryRabbitMQ re-established', { module: 'amqp-ts' })
                        this._emitter.emit('re_established_connection')
                    } else {
                        log.log('info', 'ConnectionFactoryRabbitMQ established.', { module: 'amqp-ts' })
                        this._emitter.emit('open_connection')
                        this.connectedBefore = true
                    }
                    resolve(null)
                }
            })
        })
        /* istanbul ignore next */
        this.initialized.catch((err) => {
            log.log('warn', 'Error creating connection!', { module: 'amqp-ts' })
            this._emitter.emit('error_connection', err)

            // throw (err)
        })

        return this.initialized
    }

    private tryToConnect(thisConnection: ConnectionFactoryRabbitMQ, retry: number, callback: (err: any) => void): void {
        AmqpLib.connect(thisConnection.url, thisConnection.socketOptions, (err, connection) => {
            /* istanbul ignore if */
            if (err) {
                thisConnection.isConnected = false
                // only do every retry once, amqplib can return multiple connection errors for one connection request (error?)
                if (retry <= this._retry) {
                    // amqpts_log.log("warn" , "Double retry " + retry + ", skipping.", {module: "amqp-ts"})
                    return
                }

                log.log('warn', 'ConnectionFactoryRabbitMQ failed.', { module: 'amqp-ts' })

                this._retry = retry
                if (thisConnection.reconnectStrategy.retries === 0 || thisConnection.reconnectStrategy.retries > retry) {
                    log.log('warn', 'ConnectionFactoryRabbitMQ retry ' + (retry + 1) +
                        ' in ' + thisConnection.reconnectStrategy.interval + 'ms',
                        { module: 'amqp-ts' })
                    thisConnection._emitter.emit('trying_connect')

                    setTimeout(thisConnection.tryToConnect,
                        thisConnection.reconnectStrategy.interval,
                        thisConnection,
                        retry + 1,
                        callback
                    )
                } else { // no reconnect strategy, or retries exhausted, so return the error
                    log.log('warn', 'ConnectionFactoryRabbitMQ failed, exiting: No connection ' +
                        'retries left (retry ' + retry + ').', { module: 'amqp-ts' })
                    callback(err)
                }
            } else {
                const restart = (e: Error) => {
                    log.log('debug', 'ConnectionFactoryRabbitMQ error occurred.', { module: 'amqp-ts' })
                    connection.removeListener('error', restart)

                    // connection.removeListener("end", restart) // not sure this is needed
                    thisConnection._rebuildAll(e) // try to rebuild the topology when the connection  unexpectedly closes
                }
                const onClose = () => {
                    connection.removeListener('close', onClose)
                    if (!this._isClosing) {
                        thisConnection._emitter.emit('lost_connection')
                        restart(new Error('ConnectionFactoryRabbitMQ closed by remote host'))
                    }

                }
                connection.on('error', restart)
                connection.on('close', onClose)
                // connection.on("end", restart) // not sure this is needed
                thisConnection._connection = connection
                thisConnection.isConnected = true

                callback(null)
            }
        })
    }

    public _rebuildAll(err: Error): Promise<void> {
        log.log('warn', 'ConnectionFactoryRabbitMQ error: ' + err.message, { module: 'amqp-ts' })

        log.log('debug', 'Rebuilding connection NOW.', { module: 'amqp-ts' })
        this.rebuildConnection()

        // re initialize exchanges, queues and bindings if they exist
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange = this._exchanges[exchangeId]
            log.log('debug', 'Re-initialize Exchange \'' + exchange.name + '\'.', { module: 'amqp-ts' })
            exchange._initialize()
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue = this._queues[queueId]
            const consumer = queue.consumer
            log.log('debug', 'Re-initialize queue \'' + queue.name + '\'.', { module: 'amqp-ts' })
            queue._initialize()
            if (consumer) {
                log.log('debug', 'Re-initialize consumer for queue \'' + queue.name + '\'.', { module: 'amqp-ts' })
                queue._initializeConsumer()
            }
        }
        for (const bindingId of Object.keys(this._bindings)) {
            const binding = this._bindings[bindingId]
            log.log('debug', 'Re-initialize binding from \'' + binding.source.name + '\' to \'' +
                binding.destination.name + '\'.', { module: 'amqp-ts' })
            binding.initialize()
        }

        return new Promise<void>((resolve, reject) => {
            this.completeConfiguration().then(() => {
                    log.log('debug', 'Rebuild success.', { module: 'amqp-ts' })
                    resolve(null)
                }, /* istanbul ignore next */
                (rejectReason) => {
                    log.log('debug', 'Rebuild failed.', { module: 'amqp-ts' })
                    reject(rejectReason)
                })
        })
    }

    public close(): Promise<void> {
        this._isClosing = true
        return new Promise<void>((resolve, reject) => {
            this.initialized.then(() => {
                this._connection.close(err => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(err)
                    } else {
                        this.isConnected = false
                        this._emitter.emit('close_connection')
                        resolve(null)
                    }
                })
            })
        })
    }

    /**
     * Make sure the whole defined connection topology is configured:
     * return promise that fulfills after all defined exchanges, queues and bindings are initialized
     */
    public completeConfiguration(): Promise<any> {
        const promises: Promise<any>[] = []
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange: Exchange = this._exchanges[exchangeId]
            promises.push(exchange.initialized)
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue: Queue = this._queues[queueId]
            promises.push(queue.initialized)
            if (queue.consumerInitialized) {
                promises.push(queue.consumerInitialized)
            }
        }
        for (const bindingId of Object.keys(this._bindings)) {
            const binding: Binding = this._bindings[bindingId]
            promises.push(binding.initialized)
        }
        return Promise.all(promises)
    }

    /**
     * Delete the whole defined connection topology:
     * return promise that fulfills after all defined exchanges, queues and bindings have been removed
     */
    public deleteConfiguration(): Promise<any> {
        const promises: Promise<any>[] = []
        for (const bindingId of Object.keys(this._bindings)) {
            const binding: Binding = this._bindings[bindingId]
            promises.push(binding.delete())
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue: Queue = this._queues[queueId]
            if (queue.consumerInitialized) {
                promises.push(queue.stopConsumer())
            }
            promises.push(queue.delete())
        }
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange: Exchange = this._exchanges[exchangeId]
            promises.push(exchange.delete())
        }
        return Promise.all(promises)
    }

    public declareExchange(name: string, type?: string, options?: IExchangeDeclarationOptions): Exchange {
        let exchange = this._exchanges[name]
        if (exchange === undefined) {
            exchange = new Exchange(this, name, type, options)
        }
        return exchange
    }

    public declareQueue(name: string, options?: IQueueDeclarationOptions): Queue {
        let queue = this._queues[name]
        if (queue === undefined) {
            queue = new Queue(this, name, options)
        }
        return queue
    }

    public declareTopology(topology: ITopology): Promise<any> {
        const promises: Promise<any>[] = []
        let i: number
        let len: number

        if (topology.exchanges !== undefined) {
            for (i = 0, len = topology.exchanges.length; i < len; i++) {
                const exchange = topology.exchanges[i]
                promises.push(this.declareExchange(exchange.name, exchange.type, exchange.options).initialized)
            }
        }
        if (topology.queues !== undefined) {
            for (i = 0, len = topology.queues.length; i < len; i++) {
                const queue = topology.queues[i]
                promises.push(this.declareQueue(queue.name, queue.options).initialized)
            }
        }
        if (topology.bindings !== undefined) {
            for (i = 0, len = topology.bindings.length; i < len; i++) {
                const binding = topology.bindings[i]
                const source = this.declareExchange(binding.source)
                let destination: Queue | Exchange
                if (binding.exchange !== undefined) {
                    destination = this.declareExchange(binding.exchange)
                } else {
                    destination = this.declareQueue(binding.queue)
                }
                promises.push(destination.bind(source, binding.pattern, binding.args))
            }
        }
        return Promise.all(promises)
    }

    get connection(): AmqpLib.Connection {
        return this._connection
    }

    get exchanges(): { [p: string]: Exchange } {
        return this._exchanges
    }

    get queues(): { [p: string]: Queue } {
        return this._queues
    }

    get bindings(): { [p: string]: Binding } {
        return this._bindings
    }
}
