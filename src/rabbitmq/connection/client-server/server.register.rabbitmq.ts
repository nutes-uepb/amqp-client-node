import { ConnectionRabbitMQ } from '../connection.rabbitmq'
import { IClientRequest, IResourceHandler } from '../../port/resource.handler.interface'
import { Message, Queue } from 'amqp-ts'
import StartConsumerResult = Queue.StartConsumerResult

export class ServerRegisterRabbitmq extends ConnectionRabbitMQ {
    private resource_handlers: Map<string, IResourceHandler[]> = new Map<string, IResourceHandler[]>()
    private consumersInitialized: Map<string, boolean> = new Map<string, boolean>()

    public registerResource(queueName: string,
                            resource: IResourceHandler): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {

                let resources_handler: IResourceHandler[] | undefined = this.resource_handlers.get(queueName)

                if (!resources_handler) {
                    this.resource_handlers.set(queueName, [resource])
                }else {
                    for (let actualResource of resources_handler)
                        if (actualResource.resourceName === resource.resourceName)
                            return resolve(false)

                    resources_handler.push(resource)
                    this.resource_handlers.set(queueName, resources_handler)
                }

                this._logger.info('Resource ' + queueName + ' registered!')
                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public registerServerWorkQueues(queueName: string): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const queue = this._connection.declareQueue(queueName, { durable: true });

                if (!this.consumersInitialized.get(queueName)) {
                    this.consumersInitialized.set(queueName, true)
                    this._logger.info('Queue creation ' + queueName + ' realized with success!')

                    await queue.activateConsumer((message) => {
                        message.ack() // acknowledge that the message has been received (and processed)

                        const clientRequest: IClientRequest = message.getContent()

                        const resources_handler: IResourceHandler[] | undefined =
                            this.resource_handlers.get(queueName)

                        for (let resource of resources_handler) {
                            if (resource.resourceName === clientRequest.resourceName){
                                try {
                                    return resource.handle.apply('', clientRequest.handle)
                                } catch (err) {
                                    this._logger.error('Consumer function returned error')
                                }
                            }
                        }
                        return null
                    }, { noAck: false }).then((result: StartConsumerResult) => {
                        this._logger.info('Server registered in ' + queueName + ' queue!')
                    })
                        .catch(err => {
                            throw err
                        })
                }

                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public registerServerFanout(queueName: string, exchangeName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const exchange = await this._connection.declareExchange(exchangeName, 'fanout', { durable: true });
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = await this._connection.declareQueue(queueName, { durable: true });
                this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                await queue.bind(exchange)

                if (!this.consumersInitialized.get(queueName)) {
                    this.consumersInitialized.set(queueName, true)

                    await queue.activateConsumer((message) => {
                        message.ack() // acknowledge that the message has been received (and processed)

                        const clientRequest: IClientRequest = message.getContent()

                        const resources_handler: IResourceHandler[] | undefined =
                            this.resource_handlers.get(queueName)

                        for (let resource of resources_handler) {
                            if (resource.resourceName === clientRequest.resourceName){
                                try {
                                    return resource.handle.apply('', clientRequest.handle)
                                } catch (err) {
                                    this._logger.error('Consumer function returned error')
                                }
                            }
                        }
                        return null
                    }, { noAck: false }).then((result: StartConsumerResult) => {
                        this._logger.info('Server registered in ' + exchangeName + ' exchange!')
                    })
                        .catch(err => {
                            throw err
                        })
                }

                return resolve(true)
            } catch (err) {
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

                const exchange = await this._connection.declareExchange(exchangeName, type, { durable: true });
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = await this._connection.declareQueue(queueName, { durable: true });
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

                        const clientRequest: IClientRequest = message.getContent()

                        const resources_handler: IResourceHandler[] | undefined =
                            this.resource_handlers.get(queueName)

                        for (let resource of resources_handler) {
                            if (resource.resourceName === clientRequest.resourceName){
                                try {
                                    return resource.handle.apply('', clientRequest.handle[0])
                                } catch (err) {
                                    this._logger.error('Consumer function returned error')
                                }
                            }
                        }
                        return null
                    }, { noAck: false }).then((result: StartConsumerResult) => {
                        this._logger.info('Server registered in ' + exchangeName + ' exchange!')
                    })
                        .catch(err => {
                            console.log(err)
                        })
                }

                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

}
