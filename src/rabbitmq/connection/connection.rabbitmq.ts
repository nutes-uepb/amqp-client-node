import { Connection, Message, Queue } from 'amqp-ts'
import { IConnectionEventBus } from '../port/connection.event.bus.interface'
import {IOptions} from '../port/configuration.inteface'
import { IEventHandler } from '../port/event.handler.interface'
import { IMessage } from '../port/message.interface'
import { IClientRequest, IResourceHandler } from '../port/resource.handler.interface'

import { ConnectionFactoryRabbitMQ } from './connection.factory.rabbitmq'
import { CustomLogger, ILogger } from '../../utils/custom.logger'
import StartConsumerResult = Queue.StartConsumerResult

/**
 * Implementation of the interface that provides conn with RabbitMQ.
 * To implement the RabbitMQ abstraction the amqp-ts library was used.
 *
 * @see {@link https://github.com/abreits/amqp-ts} for more details.
 * @implements {IConnectionEventBus}
 */
export class ConnectionRabbitMQ implements IConnectionEventBus {

    private static idConnection: string

    private routing_key_handlers: Map<string, IEventHandler<any>> = new Map<string, IEventHandler<any>>()

    private event_handlers: Map<string, IEventHandler<any>> = new Map<string, IEventHandler<any>>()

    private resource_handlers: Map<string, IResourceHandler> = new Map<string, IResourceHandler>()

    private consumersInitialized: Map<string, boolean> = new Map<string, boolean>()

    private _connection?: Connection

    private _receiveFromYourself: boolean = false

    private readonly _logger: ILogger = new CustomLogger()

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
     * @param host
     * @param port
     * @param username
     * @param password
     * @param options
     */
    public tryConnect(host: string,
                      port: number,
                      username: string,
                      password: string,
                      options ?: IOptions): Promise<Connection> {
        return new Promise<Connection>((resolve, reject) => {
            if (this.isConnected) return resolve(this._connection)

            new ConnectionFactoryRabbitMQ(host, port, username, password, options)
                .createConnection()
                .then((connection: Connection) => {
                    this._connection = connection

                    this._connection.on('error_connection', (err: Error) => {
                        this._logger.error('Error during connection ')
                    })

                    this._connection.on('close_connection', () => {
                        this._logger.info('Close connection with success! ')
                    })

                    this._connection.on('open_connection', () => {
                        this._logger.info('Connection established.')
                    })

                    this._connection.on('lost_connection', () => {
                        this._logger.warn('Lost connection ')
                    })

                    this._connection.on('trying_connect', () => {
                        this._logger.warn('Trying re-established connection')
                    })

                    this._connection.on('re_established_connection', () => {
                        this._logger.warn('Re-established connection')
                    })

                    return resolve(this._connection)
                })
                .catch(err => {

                    switch (err.code) {
                        case 'ENOTFOUND' || 'SELF_SIGNED_CERT_IN_CHAIN' || 'ECONNREFUSED':
                            this._logger.error('Error during the connection. Error code: ' + err.code)
                            break
                        case '...':
                            this._logger.warn('Error during the connection Error code: ' + err.code)
                            break
                        default:
                            this._logger.error('No mapped e error during the connection')
                            break
                    }

                    return reject(err)
                })
        })
    }

    public closeConnection(): Promise<boolean> {

        return new Promise<boolean|undefined>( async (resolve, reject) => {
            if (this.isConnected) {
                this._connection.close().then(() => {
                    return resolve(true)
                }).catch( err => {
                    return reject(err)
                })
            } else
                return resolve(false)
        })
    }


    public sendMessageWorkQueues(eventName: string,
                                 queueName: string,
                                 message:  any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let msg = await this.createMessage(eventName, message)

                    let queue = await this._connection.declareQueue(queueName, { durable: true })
                    queue.send(msg)
                    this._logger.info('Bus event message sent with success!')

                    return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public sendMessageFanout(eventName: string,
                             exchangeName: string,
                             message:  any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let msg = await this.createMessage(eventName, message)

                    const exchange = this._connection.declareExchange(exchangeName, 'fanout', { durable: true })

                    if (await exchange.initialized) {
                        exchange.send(msg)
                        this._logger.info('Bus event message sent with success!')
                        await exchange.close()
                    }

                return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public sendMessageTopicOrDirec(type: string,
                                   exchangeName: string,
                                   topicKey: string,
                                   message:  any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let msg = await this.createMessage(message)

                    const exchange = this._connection.declareExchange(exchangeName, type, { durable: true })

                    if (await exchange.initialized) {
                        exchange.send(msg, topicKey)
                        this._logger.info('Bus event message sent with success!')
                        await exchange.close()
                    }

                    return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
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

                    if (!this.consumersInitialized.get(queueName)){
                        this.consumersInitialized.set(queueName, true)
                        this._logger.info('Queue creation ' + queueName + ' realized with success!')

                        await queue.activateConsumer((message: Message) => {
                            message.ack() // acknowledge that the message has been received (and processed)

                            if (message.properties.appId === ConnectionRabbitMQ.idConnection &&
                                !this._receiveFromYourself) return

                            this._logger.info(`Bus event message received with success!`)
                            const routingKey: string = message.fields.routingKey

                            for (const entry of this.routing_key_handlers.keys()) {
                                if (this.regExpr(entry, routingKey)){
                                    const event_handler: IEventHandler<any> | undefined = this.routing_key_handlers.get(entry)

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

    public registerResource(resourceName: string,
                            resource: IResourceHandler): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {
                this.resource_handlers.set(resourceName, resource)
                this._logger.info('Resource ' + resourceName + ' registered!')
                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public registerClientWorkQueues(callback: (message: any) => void,
                                    queueName: string,
                                    resource: IClientRequest): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const queue = this._connection.declareQueue(queueName, {durable: false});

                queue.rpc(resource).then(msg => {
                    callback(msg.getContent())
                }).catch(e => {
                    // console.log(e)
                })

                this._logger.info('Client registered in ' + queueName + ' queue!' )
                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public registerClientFanout(callback: (message: any) => void,
                                exchangeName: string,
                                resource: IClientRequest): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const exchange = this._connection.declareExchange(exchangeName, 'fanout', {durable: false});

                exchange.rpc(resource).then(msg => {
                    callback(msg.getContent())
                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!' )
                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public registerClientDirectOrTopic(callback: (message: any) => void,
                                       exchangeName: string,
                                       routingKey: string,
                                       resource: IClientRequest): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const exchange = this._connection.declareExchange(exchangeName, 'direct', {durable: false});

                exchange.rpc(resource, routingKey).then(msg => {
                    callback(msg.getContent())
                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!' )
                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public registerServerWorkQueues(queueName: string): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const queue = this._connection.declareQueue(queueName, {durable: false});

                if (!this.consumersInitialized.get(queueName)) {
                    this.consumersInitialized.set(queueName, true)
                    this._logger.info('Queue creation ' + queueName + ' realized with success!')

                    await queue.activateConsumer((message) => {
                        message.ack() // acknowledge that the message has been received (and processed)

                        const clientRequest : IClientRequest = message.getContent()

                        const resource_handler: IResourceHandler | undefined = this.resource_handlers.get(clientRequest.resourceName)

                        if (resource_handler) {
                            try {
                                return resource_handler.handle.apply('',clientRequest.handle)
                            }catch (err) {
                                this._logger.error('Consumer function returned error' )
                            }
                        }

                    }, { noAck: false }).then((result: StartConsumerResult) => {
                        this._logger.info('Server registered in ' + queueName + ' queue!' )
                    })
                        .catch(err => {
                            throw err
                        })
                }

                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public registerServerFanout(exchangeName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const exchange = await this._connection.declareExchange(exchangeName, 'fanout', {durable: false});
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = await this._connection.declareQueue('', {durable: false});
                this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                await queue.bind(exchange)

                await queue.activateConsumer((message) => {
                    message.ack() // acknowledge that the message has been received (and processed)

                    const clientRequest : IClientRequest = message.getContent()

                    const resource_handler: IResourceHandler | undefined = this.resource_handlers.get(clientRequest.resourceName)

                    if (resource_handler) {
                        try {
                            return resource_handler.handle.apply('',clientRequest.handle)
                        }catch (err) {
                            console.log(err)
                        }
                    }

                }, { noAck: false }).then((result: StartConsumerResult) => {
                    this._logger.info('Server registered in ' + exchangeName + ' exchange!' )
                })
                    .catch(err => {
                        throw err
                    })

                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public registerServerDirectOrTopic(type: string,
                                       exchangeName: string,
                                       routingKey: string,
                                       queueName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const exchange = await this._connection.declareExchange(exchangeName, type, {durable: true});
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = await this._connection.declareQueue(queueName, {durable: true});
                this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                await queue.bind(exchange)

                if (await exchange.initialized) {
                    this._logger.info('RoutingKey ' + routingKey + ' registered!')
                    queue.bind(exchange, routingKey)
                }

                if (!this.consumersInitialized.get(queueName)) {
                    this.consumersInitialized.set(queueName, true)

                    await queue.activateConsumer((message) => {
                        message.ack() // acknowledge that the message has been received (and processed)

                        const clientRequest : IClientRequest = message.getContent()

                        const resource_handler: IResourceHandler | undefined = this.resource_handlers.get(clientRequest.resourceName)

                        if (resource_handler) {
                            try {
                                return resource_handler.handle.apply('',clientRequest.handle)
                            }catch (err) {
                                console.log(err)
                            }
                        }

                    }, { noAck: false }).then((result: StartConsumerResult) => {
                        this._logger.info('Server registered in ' + exchangeName + ' exchange!' )
                    })
                        .catch(err => {
                            throw err
                        })
                }

                return resolve(true)
            }catch (err) {
                return reject(err)
            }
        })
    }

    set receiveFromYourself(value: boolean) {
        this._receiveFromYourself = value
    }

    get receiveFromYourself() {
        return this._receiveFromYourself
    }

    public logger(enabled: boolean,
                  level?: string): void{
        this._logger.changeLoggerConfiguration(enabled, level)
        return
    }

    private createMessage(message:  any,
                          eventName?: string): Promise<Message> {
        return new Promise<Message>(async (resolve, reject) => {
            try {
                const msg: IMessage = {
                    timestamp: new Date().toISOString(),
                    body: message
                }

                if (eventName)
                    msg.eventName = eventName

                if (!ConnectionRabbitMQ.idConnection)
                    ConnectionRabbitMQ.idConnection = 'id-' + Math.random().toString(36).substr(2, 16)

                const rabbitMessage: Message = new Message(msg)
                rabbitMessage.properties.appId = ConnectionRabbitMQ.idConnection

                return resolve(rabbitMessage)

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

            const event_handler: IEventHandler<any> | undefined = this.event_handlers.get(message.getContent().eventName)

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

            const regex = new RegExp( pattern )
            return regex.test(expression)
        }catch (e) {
            console.log(e)
        }
    }

}
