import { IResourceHandler } from './resource.handler.interface'

export interface IServerRegister {

    registerResource(queueName: string,
                     resource: IResourceHandler): Promise<boolean>

    unregisterResource(queueName: string, resourceName: string): Promise<boolean>

    getResource(): Map<string, any>

    registerServerDirectOrTopic(type: string,
                                exchangeName: string,
                                routingKey: string,
                                queueName: string): Promise<boolean>
}
