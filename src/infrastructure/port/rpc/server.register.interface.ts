import { IResourceHandler } from './resource.handler.interface'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

export interface IServerRegister {

    registerResource(queueName: string,
                     resource: IResourceHandler): Promise<boolean>

    unregisterResource(queueName: string, resourceName: string): Promise<boolean>

    getResource(): Map<string, any>

    registerRoutingKeyServer(exchangeName: string,
                             routingKey: string,
                             queueName: string,
                             config: ICommunicationConfig): Promise<boolean>
}
