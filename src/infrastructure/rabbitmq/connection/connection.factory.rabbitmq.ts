// The MIT License (MIT)
//
// Copyright (c) 2015 abreits
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Binding } from '../bus/binding'
import { Queue } from '../bus/queue'
import { Exchange } from '../bus/exchange'

import * as AmqpLib from 'amqplib/callback_api'
import { inject, injectable } from 'inversify'
import { IConnectionFactory, ITopology } from '../../port/connection/connection.factory.interface'
import { IExchangeOptions } from '../../../application/port/exchange.option.interface'
import { IQueueOptions } from '../../../application/port/queue.option.interface'
import { IConnectionOptions } from '../../../application/port/connection.config.inteface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'

@injectable()
export class ConnectionFactoryRabbitMQ implements IConnectionFactory {
    public initialized: Promise<void>
    public isConnected: boolean = false

    private url: string
    private socketOptions: any
    private reconnectStrategy: IConnectionOptions
    private _connectedBefore = false

    private _connection: AmqpLib.Connection
    private _retry: number
    private _rebuilding: boolean = false
    private _isClosing: boolean = false

    private _exchanges: { [id: string]: Exchange }
    private _queues: { [id: string]: Queue }
    private _bindings: { [id: string]: Binding }

    constructor(@inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    /**
     * Create instance of {@link Connection} Class.
     *
     * @return Promise<Connection>
     * @param url
     * @param socketOptions
     * @param reconnectStrategy
     */
    public async createConnection(url, socketOptions: any = {},
                                  reconnectStrategy: IConnectionOptions): Promise<this> {
        this.url = url
        this.socketOptions = socketOptions
        this.reconnectStrategy = reconnectStrategy
        this._exchanges = {}
        this._queues = {}
        this._bindings = {}

        await this.rebuildConnection()
        return Promise.resolve(this)
    }

    get connectedBefore(): boolean {
        return this._connectedBefore
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

    private async rebuildConnection(): Promise<any> {
        if (this._rebuilding) { // only one rebuild process can be active at any time
            // ConnectionFactoryRabbitMQ rebuild already in progress, joining active rebuild attempt.
            return this.initialized
        }
        this._retry = -1
        this._rebuilding = true
        this._isClosing = false

        // rebuild the connection
        this.initialized = new Promise<void>((resolve, reject) => {
            this.tryToConnect(this, 0, (err) => {
                if (err) {
                    this._logger.error('Connection error: ' + err.message)
                    this._emitter.emit('_error', err)
                    this._rebuilding = false
                    return reject(err)
                }
                this._rebuilding = false
                if (this._connectedBefore) {
                    this._logger.warn('Connection reestablished.')
                    this._emitter.emit('reestablished')
                } else {
                    // ConnectionFactoryRabbitMQ established.
                    this._logger.warn('Connection established.')
                    this._emitter.emit('connected')
                    this._connectedBefore = true
                }
                return resolve(null)
            })
        })
        return this.initialized
    }

    private tryToConnect(thisConnection: ConnectionFactoryRabbitMQ, retry: number, callback: (err: any) => void): void {
        AmqpLib.connect(thisConnection.url, thisConnection.socketOptions, (err, connection) => {
            if (err) {
                thisConnection.isConnected = false
                // only do every retry once, amqplib can return multiple connection errors for one connection request (error?)
                if (retry <= this._retry) return

                // ConnectionFactoryRabbitMQ failed.
                this._retry = retry
                this._isClosing = thisConnection._isClosing
                if (thisConnection.reconnectStrategy.retries === 0 || thisConnection.reconnectStrategy.retries > retry) {
                    if (!thisConnection.connectedBefore) thisConnection._logger.warn('Trying to establish connection.')
                    else thisConnection._logger.warn('Trying to reestablish connection.')
                    thisConnection._emitter.emit('trying')

                    setTimeout(thisConnection.tryToConnect,
                        thisConnection.reconnectStrategy.interval,
                        thisConnection,
                        retry + 1,
                        callback
                    )
                } else { // no reconnect strategy, or retries exhausted, so return the error
                    callback(err)
                }
            } else {
                const restart = (e: Error) => {
                    // ConnectionFactoryRabbitMQ error occurred.
                    connection.removeListener('error', restart)

                    // connection.removeListener("end", restart) // not sure this is needed
                    thisConnection._rebuildAll(e) // try to rebuild the topology when the connection  unexpectedly closes
                }
                const onClose = () => {
                    thisConnection._connection.removeListener('close', onClose)
                    if (!thisConnection._isClosing) {
                        thisConnection._logger.warn('Connection lost.')
                        thisConnection._emitter.emit('disconnected')
                        restart(new Error('ConnectionFactoryRabbitMQ closed by remote host'))
                    }
                }
                thisConnection._connection = connection
                thisConnection._connection.on('error', restart)
                thisConnection._connection.on('close', onClose)
                thisConnection.isConnected = true

                callback(null)
            }
        })
    }

    public _rebuildAll(err: Error): Promise<void> {
        this.rebuildConnection()

        // re initialize exchanges, queues and bindings if they exist
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange = this._exchanges[exchangeId]
            exchange._initialize()
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue = this._queues[queueId]
            const consumer = queue.consumer
            // Re-initialize queue
            queue._initialize()
            if (consumer) {
                // Re-initialize consumer for queue.
                queue._initializeConsumer()
            }
        }
        for (const bindingId of Object.keys(this._bindings)) {
            const binding = this._bindings[bindingId]
            binding.initialize()
        }

        return new Promise<void>((resolve, reject) => {
            this.completeConfiguration().then(() => {
                    // Rebuild success.
                    resolve(null)
                },
                (rejectReason) => {
                    // Rebuild failed.
                    reject(rejectReason)
                })
        })
    }

    public close(): Promise<void> {
        this._isClosing = true
        return new Promise<void>((resolve, reject) => {
            this.initialized.then(() => {
                this._connection.close(err => {
                    if (err) {
                        reject(err)
                    } else {
                        this.isConnected = false
                        this._logger.warn('Connection has been closed.')
                        this._emitter.emit('disconnected')
                        this._emitter.removeAllListeners()
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

    public declareExchange(name: string, type?: string, options: IExchangeOptions = {}): Exchange {
        let exchange = this._exchanges[name]
        if (exchange === undefined || !this.isEqualOptions(exchange.options, options)) {
            exchange = new Exchange(this, name, type, options)
        }
        return exchange
    }

    public declareQueue(name: string, options: IQueueOptions = {}): Queue {
        let queue = this._queues[name]
        if (queue === undefined || !this.isEqualOptions(queue.options, options)) {
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

    private isEqualOptions(firstOptions: IQueueOptions | IExchangeOptions,
                           secondOptions: IQueueOptions | IExchangeOptions): boolean {
        for (const key of Object.keys(firstOptions)) {
            if (firstOptions[key] !== secondOptions[key]) return false
        }
        return true
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.on(event, listener)
    }
}
