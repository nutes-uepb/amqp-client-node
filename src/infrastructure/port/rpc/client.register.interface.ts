import { IClientRequest } from './resource.handler.interface'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

export interface IClientRegister {

    registerRoutingKeyClient(exchangeName: string,
                             resource: IClientRequest,
                             config: ICommunicationConfig): Promise<any>
}
