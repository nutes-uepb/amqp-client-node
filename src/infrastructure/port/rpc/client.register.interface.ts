import { IClientRequest } from './resource.handler.interface'
import { IConnectionBase } from '../configuration.inteface'

export interface IClientRegister extends IConnectionBase {

    registerClientDirectOrTopic(type: string,
                                exchangeName: string,
                                resource: IClientRequest,
                                callback?: (err, message: any) => void): Promise<any>
}
