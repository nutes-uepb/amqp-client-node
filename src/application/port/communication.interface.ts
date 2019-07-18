import { RegisterResource } from '../communication/base/register.resource'

export interface ICommunication {

    pub(...any: any): Promise<boolean>

    sub(...any: any): void

    rpcClient(...any: any): Promise<boolean>

    rpcServer(...any: any): Promise<RegisterResource>

    on(event: string | symbol, listener: (...args: any[]) => void): void

}
