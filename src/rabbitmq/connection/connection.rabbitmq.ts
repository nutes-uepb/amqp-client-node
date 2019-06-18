import { Connection, Message, Queue } from 'amqp-ts'
import { IConnectionEventBus } from '../port/connection.event.bus.interface'
import { ConnectionFactoryRabbitMQ } from './connection.factory.rabbitmq'

import {IOptions} from '../port/configuration.inteface'
import { IEventHandler } from '../port/event.handler.interface'
import { CustomLogger, ILogger } from '../../utils/custom.logger'
import StartConsumerResult = Queue.StartConsumerResult
import { IMessage } from '../port/message.interface'

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
    public tryConnect(host: string, port: number, username: string, password: string, options ?: IOptions): Promise<Connection> {
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

    public sendMessage(type: string, exchangeName: string, topicKey: string, queueName: string, message:  any, eventName?: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {

                    const msg: IMessage = {
                        eventName,
                        timestamp: new Date().toISOString(),
                        body: message
                    }

                    if (!ConnectionRabbitMQ.idConnection)
                        ConnectionRabbitMQ.idConnection = 'id-' + Math.random().toString(36).substr(2, 16)

                    const rabbitMessage: Message = new Message(msg)
                    rabbitMessage.properties.appId = ConnectionRabbitMQ.idConnection

                    if (type === 'work_queues'){
                        let queue = await this._connection.declareQueue(queueName, { durable: true })
                        queue.send(rabbitMessage)
                        this._logger.info('Bus event message sent with success!')
                    }


                    else if (type === 'fanout') {
                        const exchange = this._connection.declareExchange(exchangeName, 'fanout', { durable: true })

                        if (await exchange.initialized) {
                            exchange.send(rabbitMessage)
                            this._logger.info('Bus event message sent with success!')
                            await exchange.close()
                        }
                    }

                    else if (type === 'topic' || type === 'direct') {
                        const exchange = this._connection.declareExchange(exchangeName, type, { durable: true })

                        if (await exchange.initialized) {
                            exchange.send(rabbitMessage, topicKey)
                            this._logger.info('Bus event message sent with success!')
                            await exchange.close()
                        }
                    }


                    return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public receiveMessage(type: string, exchangeName: string, topicKey: string, queueName: string,
                          callback: IEventHandler<any>, eventName?: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {

                    if (type === 'work_queues'){
                        await this.subscribeWorkQueues(eventName, queueName, callback)
                    }

                    else if (type === 'fanout'){
                        await this.subscribeFanout(eventName, exchangeName, callback)
                    }

                    else if (type === 'topic' || type === 'direct') {
                        await this.subscribeTopicOrDirect(type, exchangeName, topicKey, queueName, callback)
                    }

                    return resolve(true)
                }

                return resolve(false)
            } catch (err) {
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

    public logger(enabled: boolean, level?: string): void{
        this._logger.changeLoggerConfiguration(enabled, level)
        return
    }

    private regExpr(pattern: string, expression: string): boolean {
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

    private async subscribeWorkQueues(eventName: string, queueName: string, callback: IEventHandler<any>): Promise<void>  {
        let queue = await this._connection.declareQueue(queueName, { durable: true })
        this.event_handlers.set(eventName, callback)
        this._logger.info('Callback message ' + eventName + ' registered!')

        if (!this.consumersInitialized.get(queueName)) {
            this.consumersInitialized.set(queueName, true)
            this._logger.info('Queue creation ' + queueName + ' realized with success!')

            try{
                await this.activateConsumerFanWork(queue)
            }catch (err) {
                throw err
            }

        }
    }

    private async subscribeFanout(eventName: string, exchangeName: string, callback: IEventHandler<any>): Promise<void>  {

        const exchange = this._connection.declareExchange(exchangeName, 'fanout', { durable: true })

        let queue = await this._connection.declareQueue('', { durable: true })

        if (await exchange.initialized) {
            this.event_handlers.set(eventName, callback)
            this._logger.info('Callback message ' + eventName + ' registered!')
            queue.bind(exchange)
        }

        this._logger.info('Queue creation ' + queue.name + ' realized with success!')

        try{
            await this.activateConsumerFanWork(queue)
        }catch (err) {
            throw err
        }

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

    private async subscribeTopicOrDirect(type: string, exchangeName: string, topicKey: string, queueName: string,
                                         callback: IEventHandler<any>): Promise<void>  {

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
    }

    }
