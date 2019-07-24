import { IClientRequest, IResourceHandler } from '../../port/rpc/resource.handler.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IConnection } from '../../port/connection/connection.interface'
import { IServerRegister } from '../../port/rpc/server.register.interface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { IStartConsumerResult } from '../../../application/port/queue.options.interface'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

@injectable()
export class ServerRegisterRabbitmq implements IServerRegister {
    private resource_handlers: Map<string, IResourceHandler[]> = new Map<string, IResourceHandler[]>()
    private consumersInitialized: Map<string, boolean> = new Map<string, boolean>()

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    public registerResource(queueName: string,
                            resource: IResourceHandler): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {

                const resources_handler: IResourceHandler[] | undefined = this.resource_handlers.get(queueName)

                if (!resources_handler) {
                    this.resource_handlers.set(queueName, [resource])
                    this._logger.info('Resource ' + queueName + ' registered!')
                    return resolve(true)
                }

                for (const actualResource of resources_handler) {
                    if (actualResource.resource_name === resource.resource_name) {
                        return resolve(false)
                    }
                }

                resources_handler.push(resource)
                this.resource_handlers.set(queueName, resources_handler)

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
            }

            for (const index in resources_handler) {
                if (resources_handler[index].resource_name === resourceName) {
                    resources_handler.splice(Number(index), 1)
                    this.resource_handlers.set(queueName, resources_handler)
                    return resolve(true)
                }
            }
        })
    }

    public getResource(): Map<string, any> {
        return this.resource_handlers
    }

    public registerRoutingKeyServer(exchangeName: string,
                                    routingKey: string,
                                    queueName: string,
                                    config: ICommunicationConfig): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                if (!this._connection.isConnected)
                    return reject(new Error('Connection Failed'))

                const exchange = await this._connection.getExchange(exchangeName, config)
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = await this._connection.getQueue(queueName, config)
                this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                if (await exchange.initialized) {
                    this._logger.info('RoutingKey ' + routingKey + ' registered!')
                    await queue.bind(exchange, routingKey)
                }

                if (!this.consumersInitialized.get(queueName)) {
                    this.consumersInitialized.set(queueName, true)

                    await queue.activateConsumer((message) => {
                        message.ack() // acknowledge that the message has been received (and processed)

                        const clientRequest: IClientRequest = message.getContent()

                        const resources_handler: IResourceHandler[] | undefined =
                            this.resource_handlers.get(queueName)

                        if (resources_handler) {
                            for (const resource of resources_handler) {
                                if (resource.resource_name === clientRequest.resource_name) {
                                    try {
                                        return resource.handle.apply('', clientRequest.handle)
                                    } catch (err) {
                                        this._logger.error(`Consumer function returned error: ${err.message}`)
                                        return err
                                    }
                                }
                            }
                        }
                        return new Error('Resource not registered in server')
                    }, { noAck: false }).then((result: IStartConsumerResult) => {
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
