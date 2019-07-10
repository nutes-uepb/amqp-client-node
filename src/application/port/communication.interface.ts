import { RegisterResource } from '../communication/register.resource'

export interface ICommunication {

    pub(...any: any): Promise<boolean>

    sub(...any: any): Promise<boolean>

    rpcClient(...any: any): Promise<boolean>

    rpcServer(...any: any): Promise<RegisterResource>

    on(event: string | symbol, listener: (...args: any[]) => void): void

}
