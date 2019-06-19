import { ConnectionRabbitMQ } from '../connection.rabbitmq'
import { IEventHandler } from '../../port/event.handler.interface'
import { Message, Queue } from 'amqp-ts'
import StartConsumerResult = Queue.StartConsumerResult

export class MessageReceiverRabbitmq extends ConnectionRabbitMQ {
    private event_handlers: Map<string, IEventHandler<any>> = new Map<string, IEventHandler<any>>()
    private consumersInitialized: Map<string, boolean> = new Map<string, boolean>()
    private routing_key_handlers: Map<string, IEventHandler<any>> = new Map<string, IEventHandler<any>>()
    private _receiveFromYourself: boolean = false

    set receiveFromYourself(value: boolean) {
        this._receiveFromYourself = value
    }

    get receiveFromYourself() {
        return this._receiveFromYourself
    }

    public receiveMessageWorkQueues(eventName: string,
                                    queueName: string,
                                    callback: IEventHandler<any>): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let queue = await this._connection.declareQueue(queueName, { durable: true })
                    this.event_handlers.set(eventName, callback)
                    this._logger.info('Callback message ' + eventName + ' registered!')

                    if (!this.consumersInitialized.get(queueName)) {
                        this.consumersInitialized.set(queueName, true)
                        this._logger.info('Queue creation ' + queueName + ' realized with success!')

                        await this.activateConsumerFanWork(queue)
                    }
                }

                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public receiveMessageFanout(eventName: string,
                                exchangeName: string,
                                callback: IEventHandler<any>): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    const exchange = this._connection.declareExchange(exchangeName, 'fanout', { durable: true })

                    let queue = await this._connection.declareQueue('', { durable: true })

                    if (await exchange.initialized) {
                        this.event_handlers.set(eventName, callback)
                        this._logger.info('Callback message ' + eventName + ' registered!')
                        queue.bind(exchange)
                    }

                    this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                    await this.activateConsumerFanWork(queue)
                }

                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public receiveMessageTopicOrDirect(type: string,
                                       exchangeName: string,
                                       topicKey: string,
                                       queueName: string,
                                       callback: IEventHandler<any>): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {

                    const exchange = this._connection.declareExchange(exchangeName, type, { durable: true })

                    let queue = await this._connection.declareQueue(queueName, { durable: true })

                    if (await exchange.initialized) {
                        this.routing_key_handlers.set(topicKey, callback)
                        this._logger.info('Callback message ' + topicKey + ' registered!')
                        queue.bind(exchange, topicKey)
                    }

                    if (!this.consumersInitialized.get(queueName)) {
                        this.consumersInitialized.set(queueName, true)
                        this._logger.info('Queue creation ' + queueName + ' realized with success!')

                        await queue.activateConsumer((message: Message) => {
                            message.ack() // acknowledge that the message has been received (and processed)

                            if (message.properties.appId === ConnectionRabbitMQ.idConnection &&
                                !this._receiveFromYourself) return

                            this._logger.info(`Bus event message received with success!`)
                            const routingKey: string = message.fields.routingKey

                            for (const entry of this.routing_key_handlers.keys()) {
                                if (this.regExpr(entry, routingKey)) {
                                    const event_handler: IEventHandler<any> | undefined =
                                        this.routing_key_handlers.get(entry)

                                    if (event_handler) {
                                        event_handler.handle(message.getContent())
                                    }
                                }
                            }

                        }, { noAck: false }).then((result: StartConsumerResult) => {
                            this._logger.info('Queue consumer ' + queue.name + ' successfully created! ')
                        })
                            .catch(err => {
                                throw err
                            })
                    }

                    return resolve(true)
                }

                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }


    private async activateConsumerFanWork(queue: Queue): Promise<void> {
        await queue.activateConsumer((message: Message) => {
            message.ack() // acknowledge that the message has been received (and processed)

            if (message.properties.appId === ConnectionRabbitMQ.idConnection &&
                !this._receiveFromYourself) return

            this._logger.info(`Bus event message received with success!`)

            const event_handler: IEventHandler<any> | undefined =
                this.event_handlers.get(message.getContent().eventName)

            if (event_handler) {
                event_handler.handle(message.getContent())
            }
        }, { noAck: false }).then((result: StartConsumerResult) => {
            this._logger.info('Queue consumer ' + queue.name + ' successfully created! ')
        })
            .catch(err => {
                throw err
            })
    }

    private regExpr(pattern: string,
                    expression: string): boolean {
        try {
            pattern = pattern.replace(/(\*)/g, '[a-zA-Z0-9_]*')
            pattern = pattern.replace(/(\.\#)/g, '.*')
            pattern = pattern.replace(/(\#)/g, '.*')

            // pattern += '+$'

            const regex = new RegExp(pattern)
            return regex.test(expression)
        } catch (e) {
            console.log(e)
        }
    }

}
