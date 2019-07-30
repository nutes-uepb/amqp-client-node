import { ConnectionFactoryRabbitMQ, log } from '../connection/connection.factory.rabbitmq'
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
} from '../../../application/port/queue.options.interface'
import { IBinding } from '../../port/bus/binding.interface'

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
                    /* istanbul ignore if */
                    if (err) {
                        reject(err)
                    } else {
                        this._channel = channel
                        const callback = (e, ok) => {
                            /* istanbul ignore if */
                            if (e) {
                                log.log('error', 'Failed to create queue \'' + this._name + '\'.', { module: 'amqp-ts' })
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
                log.log('warn', 'Channel failure, error caused during connection!', { module: 'amqp-ts' })
            })
        })
    }

    private static _packMessageContent(content: any, options: any): Buffer {
        if (typeof content === 'string') {
            content = new Buffer(content)
        } else if (!(content instanceof Buffer)) {
            content = new Buffer(JSON.stringify(content))
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
        console.log('HERE0')
        // inline function to send the message
        const sendMessage = () => {
            try {
                this._channel.sendToQueue(this._name, content, options)
            } catch (err) {
                log.log('debug', 'Queue publish error: ' + err.messageBus, { module: 'amqp-ts' })
                const queueName = this._name
                const connection = this._connection
                log.log('debug', 'Try to rebuild connection, before Call.', { module: 'amqp-ts' })
                connection._rebuildAll(err).then(() => {
                    log.log('debug', 'Retransmitting message.', { module: 'amqp-ts' })
                    connection.queues[queueName].publish(content, options)
                })
            }
        }

        content = Queue._packMessageContent(content, options)
        // execute sync when possible
        // if (this.initialized.isFulfilled()) {
        //   sendMessage()
        // } else {
        this._initialized.then(sendMessage)
        // }
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
                    const result = new BusMessage(resultMsg.content, resultMsg.fields)
                    result.fields = resultMsg.fields
                    resolve(result)
                }, { noAck: true }, (err, ok) => {
                    /* istanbul ignore if */
                    if (err) {
                        reject(new Error('amqp-ts: Queue.rpc error: ' + err.messageBus))
                    } else {
                        // send the rpc request
                        consumerTag = ok.consumerTag
                        const message = new BusMessage(requestParameters, { replyTo: DIRECT_REPLY_TO_QUEUE })
                        message.sendTo(this)
                    }
                })
            }

            const sync: boolean = false

            this._initialized.then(() => sync)

            // execute sync when possible
            // if (this.initialized.isFulfilled()) {
            //   processRpc()
            // } else {
            this._initialized.then(processRpc)
            // }
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
                reject(new Error('amqp-ts Queue.startConsumer error: consumer already defined'))
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
                reject(new Error('amqp-ts Queue.activateConsumer error: consumer already defined'))
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
                /* istanbul ignore if */
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
                            log.log('error', 'Queue.onMessage RPC promise returned error: '
                                + err.messageBus, { module: 'amqp-ts' })
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
                /* istanbul ignore next */
                log.log('error', 'Queue.onMessage consumer function returned error: ' + err.messageBus, { module: 'amqp-ts' })
            }
        }

        const rawMsgConsumer = (msg: AmqpLib.Message) => {
            try {
                this._consumer(msg, this._channel)
            } catch (err) {
                /* istanbul ignore next */
                log.log('error', 'Queue.onMessage consumer function returned error: ' + err.messageBus, { module: 'amqp-ts' })
            }
        }

        const activateConsumerWrapper = (msg: AmqpLib.Message) => {
            try {
                const message = new BusMessage(msg.content, msg.properties)
                message.fields = msg.fields
                message.message = msg
                message.channel = this._channel
                let result = this._consumer(message)
                // check if there is a reply-to
                if (msg.properties.replyTo) {
                    if (result instanceof Promise) {
                        result.then((resultValue) => {
                            if (!(resultValue instanceof BusMessage)) {
                                resultValue = new BusMessage(resultValue, {})
                            }
                            resultValue.properties.correlationId = msg.properties.correlationId
                            this._channel.sendToQueue(msg.properties.replyTo, resultValue.contentBuffer, resultValue.properties)
                        }).catch((err) => {
                            log.log('error', 'Queue.onMessage RPC promise returned error: '
                                + err.messageBus, { module: 'amqp-ts' })
                        })
                    } else {
                        if (!(result instanceof BusMessage)) {
                            result = new BusMessage(result, {})
                        }
                        result.properties.correlationId = msg.properties.correlationId
                        this._channel.sendToQueue(msg.properties.replyTo, result.contentBuffer, result.properties)
                    }
                }
            } catch (err) {
                /* istanbul ignore next */
                log.log('error', 'Queue.onMessage consumer function returned error: ' + err.messageBus, { module: 'amqp-ts' })
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
                        /* istanbul ignore if */
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
                    /* istanbul ignore if */
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
                        /* istanbul ignore if */
                        if (err) {
                            reject(err)
                        } else {
                            delete this._initialized // invalidate queue
                            delete this._connection.queues[this._name] // remove the queue from our administration
                            this._channel.close((e) => {
                                /* istanbul ignore if */
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
                        /* istanbul ignore if */
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
