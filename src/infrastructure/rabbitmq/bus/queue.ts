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

import { ConnectionFactoryRabbitMQ } from '../connection/connection.factory.rabbitmq'
import { Binding } from './binding'
import { BusMessage } from './bus.message'
import { Exchange } from './exchange'
import * as AmqpLib from 'amqplib/callback_api'
import {
    IActivateConsumerOptions,
    IDeleteResult,
    IQueueInitializeResult,
    IQueueOptions,
    IStartConsumerOptions,
    IStartConsumerResult
} from '../../../application/port/queue.option.interface'
import { IBinding } from '../../port/bus/binding.interface'
import { DI } from '../../../di/di'
import { Identifier } from '../../../di/identifier'

const DIRECT_REPLY_TO_QUEUE = 'amq.rabbitmq.reply-to'

export class Queue {
    private _initialized: Promise<IQueueInitializeResult>

    private _connection: ConnectionFactoryRabbitMQ
    private _channel: AmqpLib.Channel
    private _name: string
    private _options: IQueueOptions

    private _consumer: (msg: any, channel?: AmqpLib.Channel) => any
    private _isStartConsumer: boolean
    private _rawConsumer: boolean
    private _consumerOptions: IStartConsumerOptions
    private _consumerTag: string
    private _consumerInitialized: Promise<IStartConsumerResult>
    private _consumerStopping: boolean
    private _deleting: Promise<IDeleteResult>
    private _closing: Promise<void>

    constructor(connection: ConnectionFactoryRabbitMQ, name: string, options: IQueueOptions = {}) {
        this._connection = connection
        this._name = name
        this._options = options
        this._connection.queues[this._name] = this
        this._initialize()
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

    get options(): IQueueOptions {
        return this._options
    }

    get consumer(): (msg: any, channel?: AmqpLib.Channel) => any {
        return this._consumer
    }

    get consumerInitialized(): Promise<IStartConsumerResult> {
        return this._consumerInitialized
    }

    get initialized(): Promise<IQueueInitializeResult> {
        return this._initialized
    }

    public _initialize(): void {
        this._initialized = new Promise<IQueueInitializeResult>((resolve, reject) => {
            this._connection.initialized.then(() => {
                this._connection.connection.createChannel((err, channel) => {
                    if (err) {
                        reject(err)
                    } else {
                        this._channel = channel
                        const callback = (e, ok) => {
                            if (e) {
                                // Failed to create queue.
                                delete this._connection.queues[this._name]
                                reject(e)
                            } else {
                                if (this._options.prefetch) {
                                    this._channel.prefetch(this._options.prefetch)
                                }
                                resolve(ok as IQueueInitializeResult)
                            }
                        }

                        if (this._options.noCreate) {
                            this._channel.checkQueue(this._name, callback)
                        } else {
                            this._channel.assertQueue(this._name, this._options as AmqpLib.Options.AssertQueue, callback)
                        }
                    }
                })
            }).catch((err) => {
                // Channel failure, error caused during connection!
            })
        })
    }

    private static _packMessageContent(content: any, options: any): Buffer {
        if (typeof content === 'string') {
            content = Buffer.from(content)
        } else if (!(content instanceof Buffer)) {
            content = Buffer.from(JSON.stringify(content))
            options.contentType = 'application/json'
        }
        return content
    }

    private static _unpackMessageContent(msg: AmqpLib.Message): any {
        let content = msg.content.toString()
        if (msg.properties.contentType === 'application/json') {
            content = JSON.parse(content)
        }
        return content
    }

    /**
     * deprecated, use 'queue.send(message: MessageBus)' instead
     */
    public publish(content: any, options: any = {}): void {
        // inline function to send the message
        const sendMessage = () => {
            try {
                this._channel.sendToQueue(this._name, content, options)
            } catch (err) {
                // Queue publish error
                const queueName = this._name
                const connection = this._connection
                // Try to rebuild connection, before Call.
                connection._rebuildAll(err).then(() => {
                    // Retransmitting message.
                    connection.queues[queueName].publish(content, options)
                })
            }
        }
        content = Queue._packMessageContent(content, options)
        this._initialized.then(sendMessage)
    }

    public send(message: BusMessage, routingKey = ''): void {
        message.sendTo(this, routingKey)
    }

    public rpc(requestParameters: any): Promise<BusMessage> {
        return new Promise<BusMessage>((resolve, reject) => {
            const processRpc = () => {
                let consumerTag: string
                this._channel.consume(DIRECT_REPLY_TO_QUEUE, (resultMsg) => {
                    this._channel.cancel(consumerTag)
                    const result: BusMessage = DI.get(Identifier.BUS_MESSAGE)
                    result.content = resultMsg.content
                    result.properties = resultMsg.fields
                    result.fields = resultMsg.fields
                    resolve(result)
                }, { noAck: true }, (err, ok) => {
                    if (err) {
                        reject(new Error('Queue.rpc error: ' + err.messageBus))
                    } else {
                        // send the rpc request
                        consumerTag = ok.consumerTag
                        const message: BusMessage = DI.get(Identifier.BUS_MESSAGE)
                        message.content = requestParameters
                        message.properties = { replyTo: DIRECT_REPLY_TO_QUEUE }
                        message.sendTo(this)
                    }
                })
            }

            const sync: boolean = false

            this._initialized.then(() => sync)
            this._initialized.then(processRpc)
        })
    }

    public prefetch(count: number): void {
        this._initialized.then(() => {
            this._channel.prefetch(count)
            this._options.prefetch = count
        })
    }

    public recover(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._initialized.then(() => {
                this._channel.recover((err, ok) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(null)
                    }
                })
            })
        })
    }

    /**
     * deprecated, use 'queue.activateConsumer(...)' instead
     */
    public startConsumer(onMessage: (msg: any, channel?: AmqpLib.Channel) => any,
                         options: IStartConsumerOptions = {})
        : Promise<IStartConsumerResult> {
        if (this._consumerInitialized) {
            return new Promise<IStartConsumerResult>((_, reject) => {
                reject(new Error('Queue.startConsumer error: consumer already defined'))
            })
        }

        this._isStartConsumer = true
        this._rawConsumer = (options.rawMessage === true)
        delete options.rawMessage // remove to avoid possible problems with amqplib
        this._consumerOptions = options
        this._consumer = onMessage
        this._initializeConsumer()

        return this._consumerInitialized
    }

    public activateConsumer(onMessage: (msg: BusMessage) => any,
                            options: IActivateConsumerOptions = {})
        : Promise<IStartConsumerResult> {
        if (this._consumerInitialized) {
            return new Promise<IStartConsumerResult>((_, reject) => {
                reject(new Error('Queue.activateConsumer error: consumer already defined'))
            })
        }

        this._consumerOptions = options
        this._consumer = onMessage
        this._initializeConsumer()

        return this._consumerInitialized
    }

    public _initializeConsumer(): void {
        const processedMsgConsumer = (msg: AmqpLib.Message) => {
            try {
                if (!msg) {
                    return // ignore empty messages (for now)
                }
                const payload = Queue._unpackMessageContent(msg)
                let result = this._consumer(payload)
                // check if there is a reply-to
                if (msg.properties.replyTo) {
                    const options: any = {}
                    if (result instanceof Promise) {
                        result.then((resultValue) => {
                            resultValue = Queue._packMessageContent(result, options)
                            this._channel.sendToQueue(msg.properties.replyTo, resultValue, options)
                        }).catch((err) => {
                            // Queue.onMessage RPC promise returned error.
                        })
                    } else {
                        result = Queue._packMessageContent(result, options)
                        this._channel.sendToQueue(msg.properties.replyTo, result, options)
                    }
                }

                if (this._consumerOptions.noAck !== true) {
                    this._channel.ack(msg)
                }
            } catch (err) {
                // Queue.onMessage consumer function returned error.
            }
        }

        const rawMsgConsumer = (msg: AmqpLib.Message) => {
            try {
                this._consumer(msg, this._channel)
            } catch (err) {
                // Queue.onMessage consumer function returned error.
            }
        }

        const activateConsumerWrapper = (msg: AmqpLib.Message) => {
            try {
                const message: BusMessage = DI.get(Identifier.BUS_MESSAGE)
                message.content = msg.content
                message.properties = msg.properties
                message.fields = msg.fields
                message.message = msg
                message.channel = this._channel
                message.acked = this._consumerOptions.noAck
                const result = this._consumer(message)
                let replyMessge: BusMessage = DI.get(Identifier.BUS_MESSAGE)
                // check if there is a reply-to
                if (msg.properties.replyTo) {
                    if (result instanceof Promise) {
                        result.then((resultValue) => {
                            if (!(resultValue instanceof BusMessage)) {
                                replyMessge.content = resultValue
                                replyMessge.properties = {}
                            } else replyMessge = resultValue
                            replyMessge.properties.correlationId = msg.properties.correlationId
                            this._channel.sendToQueue(msg.properties.replyTo, replyMessge.contentBuffer, replyMessge.properties)
                        }).catch((err) => {
                            // Queue.onMessage RPC promise returned error.
                        })
                    } else {
                        if (!(result instanceof BusMessage)) {
                            replyMessge.content = result
                            replyMessge.properties = {}
                        } else replyMessge = result
                        replyMessge.properties.correlationId = msg.properties.correlationId
                        this._channel.sendToQueue(msg.properties.replyTo, replyMessge.contentBuffer, replyMessge.properties)
                    }
                }
            } catch (err) {
                // Queue.onMessage consumer function returned error.
            }
        }

        this._consumerInitialized = new Promise<IStartConsumerResult>((resolve, reject) => {
            this._initialized.then(() => {
                let consumerFunction = activateConsumerWrapper
                if (this._isStartConsumer) {
                    consumerFunction = this._rawConsumer ? rawMsgConsumer : processedMsgConsumer
                }
                this._channel.consume(this._name, consumerFunction,
                    this._consumerOptions as AmqpLib.Options.Consume, (err, ok) => {
                        if (err) {
                            reject(err)
                        } else {
                            this._consumerTag = ok.consumerTag
                            resolve(ok)
                        }
                    })
            })
        })
    }

    public stopConsumer(): Promise<void> {
        if (!this._consumerInitialized || this._consumerStopping) {
            return Promise.resolve()
        }
        this._consumerStopping = true
        return new Promise<void>((resolve, reject) => {
            this._consumerInitialized.then(() => {
                this._channel.cancel(this._consumerTag, (err, ok) => {
                    if (err) {
                        reject(err)
                    } else {
                        delete this._consumerInitialized
                        delete this._consumer
                        delete this._consumerOptions
                        delete this._consumerStopping
                        resolve(null)
                    }
                })
            })
        })
    }

    public delete(): Promise<IDeleteResult> {
        if (this._deleting === undefined) {
            this._deleting = new Promise<IDeleteResult>((resolve, reject) => {
                this._initialized.then(() => {
                    return Binding.removeBindingsContaining(this)
                }).then(() => {
                    return this.stopConsumer()
                }).then(() => {
                    return this._channel.deleteQueue(this._name, {}, (err, ok) => {
                        if (err) {
                            reject(err)
                        } else {
                            delete this._initialized // invalidate queue
                            delete this._connection.queues[this._name] // remove the queue from our administration
                            this._channel.close((e) => {
                                if (e) {
                                    reject(e)
                                } else {
                                    delete this._channel
                                    delete this._connection
                                    resolve(ok as IDeleteResult)
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
                    return this.stopConsumer()
                }).then(() => {
                    delete this._initialized // invalidate queue
                    delete this._connection.queues[this._name] // remove the queue from our administration
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

}
