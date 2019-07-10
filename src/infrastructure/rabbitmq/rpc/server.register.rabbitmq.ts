import { IClientRequest, IResourceHandler } from '../../port/rpc/resource.handler.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IConnection } from '../../port/connection/connection.interface'
import { Queue } from '../bus/queue'
import { IServerRegister } from '../../port/rpc/server.register.interface'
import { IConfigurationParameters } from '../../port/configuration.inteface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import StartConsumerResult = Queue.IStartConsumerResult

@injectable()
export class ServerRegisterRabbitmq implements IServerRegister {
    private resource_handlers: Map<string, IResourceHandler[]> = new Map<string, IResourceHandler[]>()
    private consumersInitialized: Map<string, boolean> = new Map<string, boolean>()

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    public setConfigurations(config: IConfigurationParameters): void {
        this._connection.setConfigurations(config)
    }

    public registerResource(queueName: string,
                            resource: IResourceHandler): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const resources_handler: IResourceHandler[] | undefined = this.resource_handlers.get(queueName)

                if (!resources_handler) {
                    this.resource_handlers.set(queueName, [resource])
                } else {
                    for (const actualResource of resources_handler)
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

    public unregisterResource(queueName: string, resourceName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            const resources_handler: IResourceHandler[] | undefined = this.resource_handlers.get(queueName)

            if (!resources_handler) {
                return resolve(false)
            } else {
                for (const index in resources_handler) {
                    if (resources_handler[index].resourceName === resourceName) {
                        resources_handler.splice(Number(index), 1)
                        this.resource_handlers.set(queueName, resources_handler)
                        return resolve(true)
                    }
                }
            }
        })
    }

    public getResource(): Map<string, any> {
        return this.resource_handlers
    }

    public registerServerDirectOrTopic(type: string,
                                       exchangeName: string,
                                       routingKey: string,
                                       queueName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                if (!this._connection.startingConnection) {
                    await this._connection.tryConnect()
                }

                if (!this._connection.isConnected)
                    return resolve(false)

                const exchange = await this._connection.getExchange(exchangeName, type)
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = await this._connection.getQueue(queueName)
                this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                if (await exchange.initialized) {
                    this._logger.info('RoutingKey ' + routingKey + ' registered!')
                    await queue.bind(exchange, routingKey)
                }

                console.log('consumer1')
                if (!this.consumersInitialized.get(queueName)) {
                    console.log('consumer2')
                    this.consumersInitialized.set(queueName, true)

                    await queue.activateConsumer((message) => {
                        message.ack() // acknowledge that the message has been received (and processed)

                        const clientRequest: IClientRequest = message.getContent()

                        const resources_handler: IResourceHandler[] | undefined =
                            this.resource_handlers.get(queueName)

                        if (resources_handler) {
                            for (const resource of resources_handler) {
                                if (resource.resourceName === clientRequest.resourceName) {
                                    try {
                                        return resource.handle.apply('', clientRequest.handle)
                                    } catch (err) {
                                        this._logger.error('Consumer function returned error')
                                    }
                                }
                            }
                        }
                        return {}
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

    public closeConnection(): Promise<boolean> {
        return this._connection.closeConnection()
    }

}
