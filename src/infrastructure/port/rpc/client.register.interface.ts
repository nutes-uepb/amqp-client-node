import { IClientRequest } from './resource.handler.interface'

export interface IClientRegister {

    registerClientDirectOrTopic(type: string,
                                exchangeName: string,
                                resource: IClientRequest,
                                callback?: (err, message: any) => void): Promise<any>
}
