import { IClientRequest } from './resource.handler.interface'
import { IClientOptions } from '../../../application/port/communication.option.interface'
import { IBusConnection } from '../connection/connection.interface'

export interface IClientRegister {

    connection: IBusConnection

    registerRoutingKeyClient(exchangeName: string,
                             resource: IClientRequest,
                             options?: IClientOptions): Promise<any>
}
