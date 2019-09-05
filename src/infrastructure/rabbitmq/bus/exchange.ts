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

import * as os from 'os'
import { ConnectionFactoryRabbitMQ } from '../connection/connection.factory.rabbitmq'
import { Binding } from './binding'
import * as AmqpLib from 'amqplib/callback_api'
import { BusMessage } from './bus.message'
import * as path from 'path'
import { IExchangeInitializeResult, IExchangeOptions } from '../../../application/port/exchange.option.interface'
import { IActivateConsumerOptions, IStartConsumerOptions } from '../../../application/port/queue.option.interface'
import { IBinding } from '../../port/bus/binding.interface'
import { DI } from '../../../di/di'
import { Identifier } from '../../../di/identifier'

const ApplicationName = process.env.AMQPTS_APPLICATIONNAME ||
    (path.parse ? path.parse(process.argv[1]).name : path.basename(process.argv[1]))

const DIRECT_REPLY_TO_QUEUE = 'amq.rabbitmq.reply-to'

export class Exchange {
    private _initialized: Promise<IExchangeInitializeResult>

    private _consumer_handlers: Array<[string, any]> = new Array<[string, any]>()
    private _isConsumerInitializedRcp: boolean = false

    private _connection: ConnectionFactoryRabbitMQ
    private _channel: AmqpLib.Channel
    private _name: string
    private _type: string
    private _options: IExchangeOptions

    private _deleting: Promise<void>
    private _closing: Promise<void>

    constructor(connection: ConnectionFactoryRabbitMQ, name: string, type?: string, options: IExchangeOptions = {}) {
        this._connection = connection
        this._name = name
        this._type = type
        this._options = options
        this._initialize()
    }

    get initialized(): Promise<IExchangeInitializeResult> {
        return this._initialized
    }

    get connection(): ConnectionFactoryRabbitMQ {
        return this._connection
    }

    get channel(): AmqpLib.Channel {
        return this._channel
    }

    get name() {
        return this._name
    }

    get options(): IExchangeOptions {
        return this._options
    }

    get type() {
        return this._type
    }

    public _initialize() {
        this._initialized = new Promise<IExchangeInitializeResult>((resolve, reject) => {
            this._connection.initialized.then(() => {
                this._connection.connection.createChannel((err, channel) => {
                    if (err) {
                        reject(err)
                    } else {
                        this._channel = channel
                        this._isConsumerInitializedRcp = false
                        const callback = (e, ok) => {
                            if (e) {
                                // Failed to create exchange.
                                delete this._connection.exchanges[this._name]
                                reject(e)
                            } else {
                                resolve(ok as IExchangeInitializeResult)
                            }
                        }
                        if (this._options.noCreate) {
                            this._channel.checkExchange(this._name, callback)
                        } else {
                            this._channel.assertExchange(this._name, this._type,
                                this._options as AmqpLib.Options.AssertExchange, callback)
                        }
                    }
                })
            }).catch((err) => {
                // Channel failure, error caused during connection!
            })
        })
        this._connection.exchanges[this._name] = this
    }

    /**
     * deprecated, use 'exchange.send(message: MessageBus)' instead
     */
    public publish(content: any, routingKey = '', options: any = {}): void {
        if (typeof content === 'string') {
            content = Buffer.from(content)
        } else if (!(content instanceof Buffer)) {
            content = Buffer.from(JSON.stringify(content))
            options.contentType = options.contentType || 'application/json'
        }
        this._initialized.then(() => {
            try {
                this._channel.publish(this._name, routingKey, content, options)
            } catch (err) {
                // Exchange publish error!
                const exchangeName = this._name
                const connection = this._connection
                connection._rebuildAll(err).then(() => {
                    // Retransmitting message.
                    connection.exchanges[exchangeName].publish(content, routingKey, options)
                })
            }
        })
    }

    public send(message: BusMessage, routingKey = ''): void {
        message.sendTo(this, routingKey)
    }

    public rpc(requestParameters: any, routingKey = '', callback: (err, message: BusMessage) => void): void {

        function generateUuid(): string {
            return Math.random().toString() +
                Math.random().toString() +
                Math.random().toString()
        }

        const processRpc = () => {
            const uuid: string = generateUuid()
            if (Object.keys(this._channel.consumers).length === 0 && !this._isConsumerInitializedRcp) {
                this._isConsumerInitializedRcp = true
                this._channel.consume(DIRECT_REPLY_TO_QUEUE, (resultMsg) => {

                    const result: BusMessage = DI.get(Identifier.BUS_MESSAGE)
                    result.content = resultMsg.content
                    result.properties = resultMsg.properties
                    result.fields = resultMsg.fields

                    for (const handler of this._consumer_handlers) {
                        if (handler[0] === resultMsg.properties.correlationId) {
                            const func: (err, parameters) => void = handler[1]

                            if (result.properties.type === 'error') {
                                func.apply('', [new Error(result.content), undefined])
                                return
                            }
                            func.apply('', [undefined, result])
                        }
                    }

                }, { noAck: true })
            }
            this._consumer_handlers.push([uuid, callback])
            const message: BusMessage = DI.get(Identifier.BUS_MESSAGE)
            message.content = requestParameters
            message.properties = { correlationId: uuid, replyTo: DIRECT_REPLY_TO_QUEUE }
            message.sendTo(this, routingKey)
        }

        this._initialized.then(processRpc)
    }

    public delete(): Promise<void> {
        if (this._deleting === undefined) {
            this._deleting = new Promise<void>((resolve, reject) => {
                this._initialized.then(() => {
                    return Binding.removeBindingsContaining(this)
                }).then(() => {
                    this._channel.deleteExchange(this._name, {}, (err, ok) => {
                        if (err) {
                            reject(err)
                        } else {
                            this._channel.close((e) => {
                                delete this._initialized // invalidate exchange
                                delete this._connection.exchanges[this._name] // remove the exchange from our administration
                                if (e) {
                                    reject(e)
                                } else {
                                    delete this._channel
                                    delete this._connection
                                    resolve(null)
                                }
                            })
                        }
                    })
                }).catch((err) => {
                    reject(err)
                })
            })
        }
        return this._deleting
    }

    public close(): Promise<void> {
        if (this._closing === undefined) {
            this._closing = new Promise<void>((resolve, reject) => {
                this._initialized.then(() => {
                    return Binding.removeBindingsContaining(this)
                }).then(() => {
                    delete this._initialized // invalidate exchange
                    delete this._connection.exchanges[this._name] // remove the exchange from our administration
                    this._channel.close((err) => {
                        if (err) {
                            reject(err)
                        } else {
                            delete this._channel
                            delete this._connection
                            resolve(null)
                        }
                    })
                }).catch((err) => {
                    reject(err)
                })
            })
        }
        return this._closing
    }

    public bind(source: Exchange, pattern = '', args: any = {}): Promise<IBinding> {
        const binding = new Binding(this, source, pattern, args)
        return binding.initialized
    }

    public unbind(source: Exchange, pattern = '', args: any = {}): Promise<void> {
        return this._connection.bindings[Binding.id(this, source, pattern)].delete()
    }

    public consumerQueueName(): string {
        return this._name + '.' + ApplicationName + '.' + os.hostname() + '.' + process.pid
    }

    /**
     * deprecated, use 'exchange.activateConsumer(...)' instead
     */
    public startConsumer(onMessage: (msg: any, channel?: AmqpLib.Channel) => any,
                         options?: IStartConsumerOptions): Promise<any> {
        const queueName = this.consumerQueueName()
        if (this._connection.queues[queueName]) {
            return new Promise<void>((_, reject) => {
                reject(new Error('Exchange.startConsumer error: consumer already defined'))
            })
        } else {
            const promises: Promise<any>[] = []
            const queue = this._connection.declareQueue(queueName, { durable: false })
            promises.push(queue.initialized)
            const binding = queue.bind(this)
            promises.push(binding)
            const consumer = queue.startConsumer(onMessage, options)
            promises.push(consumer)

            return Promise.all(promises)
        }
    }

    public activateConsumer(onMessage: (msg: BusMessage) => any, options?: IActivateConsumerOptions): Promise<any> {
        const queueName = this.consumerQueueName()
        if (this._connection.queues[queueName]) {
            return new Promise<void>((_, reject) => {
                reject(new Error('Exchange.activateConsumer error: consumer already defined'))
            })
        } else {
            const promises: Promise<any>[] = []
            const queue = this._connection.declareQueue(queueName, { durable: false })
            promises.push(queue.initialized)
            const binding = queue.bind(this)
            promises.push(binding)
            const consumer = queue.activateConsumer(onMessage, options)
            promises.push(consumer)

            return Promise.all(promises)
        }
    }

    public stopConsumer(): Promise<any> {
        const queue = this._connection.queues[this.consumerQueueName()]
        if (queue) {
            return queue.delete()
        } else {
            return Promise.resolve()
        }
    }

}
