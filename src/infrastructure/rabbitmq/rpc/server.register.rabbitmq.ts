import { IClientRequest, IResourceHandler } from '../../port/rpc/resource.handler.interface'
import { IServerOptions } from '../../../application/port/communication.option.interface'
import { IBusConnection } from '../../port/connection/connection.interface'
import { IActivateConsumerOptions } from '../../../application/port/queue.option.interface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { DI } from '../../../di/di'
import { IServerRegister } from '../../../application/port/server.register.interface'
import { Queue } from '../bus/queue'
import { IBusMessage } from '../../../application/port/bus.message.inteface'

export class ServerRegisterRabbitmq implements IServerRegister {

    private resource_handlers: Map<string, IResourceHandler[]> = new Map<string, IResourceHandler[]>()

    private readonly _logger: ICustomLogger

    constructor(private readonly _connection: IBusConnection,
                private readonly _queueName: string,
                private readonly _exchangeName: string,
                private readonly _routingKeys: string[],
                private readonly _options?: IServerOptions) {
        this._logger = DI.get(Identifier.CUSTOM_LOGGER)
    }

    public async start(): Promise<void> {
        try {
            await this
                .registerRoutingKeyServer(this._queueName, this._exchangeName, this._routingKeys, this._options)
            return Promise.resolve()
        } catch (err) {
            return Promise.reject(err)
        }
    }

    public addResource(resourceName: string, resource: (...any: any) => any): boolean {

        const resourceHandler: IResourceHandler = {
            resource_name: resourceName,
            handle: resource
        }

        return this.registerResource(this._queueName, resourceHandler)
    }

    public removeResource(resourceName: string): boolean {

        return this.unregisterResource(this._queueName, resourceName)
    }

    public getAllResource(): object {

        const resources = this.getResource()

        if (resources)
            return resources
        else
            return {}
    }

    private registerResource(queueName: string,
                             resource: IResourceHandler): boolean {

        const resources_handler: IResourceHandler[] | undefined = this.resource_handlers.get(queueName)

        if (!resources_handler) {
            this.resource_handlers.set(queueName, [resource])
            this._logger.info('Resource ' + resource.resource_name + ' registered!')
            return true
        }

        for (const actualResource of resources_handler) {
            if (actualResource.resource_name === resource.resource_name) {
                return false
            }
        }

        resources_handler.push(resource)
        this.resource_handlers.set(queueName, resources_handler)

        this._logger.info('Resource ' + resource.resource_name + ' registered!')
        return true
    }

    private unregisterResource(queueName: string, resourceName: string): boolean {
        const resources_handler: IResourceHandler[] | undefined = this.resource_handlers.get(queueName)

        if (!resources_handler) {
            return false
        }

        for (const index in resources_handler) {
            if (resources_handler[index].resource_name === resourceName) {
                resources_handler.splice(Number(index), 1)
                this.resource_handlers.set(queueName, resources_handler)
                return true
            }
        }
    }

    private getResource(): Map<string, any> {
        return this.resource_handlers
    }

    private registerRoutingKeyServer(queueName: string,
                                     exchangeName: string,
                                     routingKey: string[],
                                     options: IServerOptions): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {

                if (this._connection && !this._connection.isConnected) {
                    return reject(new Error('Connection Failed'))
                }

                const exchange = await this._connection.getExchange(exchangeName, options ? options.exchange : undefined)
                await exchange.initialized
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!')

                const queue = this._connection.getQueue(queueName, options ? options.queue : undefined)
                await queue.initialized
                this._logger.info('Queue creation ' + queue.name + ' realized with success!')

                this._logger.info('RoutingKey ' + routingKey + ' registered!')

                if (routingKey.length > 0) for (const key of routingKey) await queue.bind(exchange, key)
                else for (const value of this.resource_handlers.get(queueName)) await queue.bind(exchange, value.resource_name)

                await this.routingKeyServerConsumer(queue, options ? options.consumer : undefined)
                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

    private async routingKeyServerConsumer(queue: Queue,
                                           consumer: IActivateConsumerOptions): Promise<void> {
        if (!queue.consumerInitialized) {
            try {
                await queue.activateConsumer((message: IBusMessage) => {
                    // acknowledge that the message has been received (and processed)
                    const clientRequest: IClientRequest = message.content

                    const resources_handler: IResourceHandler[] | undefined =
                        this.resource_handlers.get(queue.name)

                    if (resources_handler) {
                        for (const resource of resources_handler) {
                            if (resource.resource_name === clientRequest.resource_name) {
                                try {
                                    return resource.handle.apply('', clientRequest.handle)
                                } catch (err) {
                                    this._logger.error(`Consumer function returned error: ${err.messageBus}`)
                                    return err
                                }
                            }
                        }
                    }
                    return new Error('Resource not registered in server')
                }, { ...consumer, ...{ noAck: true } })
                this._logger.info('Server registered in' + queue.name + 'queue! ')
            } catch (err) {
                return Promise.reject(err)
            }
        }
        return Promise.resolve()
    }
}
