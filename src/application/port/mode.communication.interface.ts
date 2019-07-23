import { RegisterResource } from '../communication/base/register.resource'

export interface IModeCommunication {

    pub(...any: any): Promise<void>

    sub(...any: any): void

    rpcClient(...any: any): Promise<boolean>

    rpcServer(...any: any): Promise<RegisterResource>

}
