import { IModeCommunication } from './mode.communication.interface'
import { RegisterResource } from '../communication/base/register.resource'

export interface IRoutingKey extends IModeCommunication {

    pub(exchangeName: string,
        routingKey: string,
        message: any): Promise<void>

    sub(exchangeName: string,
        queueName: string,
        routingKey: string,
        callback: (message: any) => void): void

    rpcClient(exchangeName: string,
              resourceName: string,
              parameters: any[],
              callback?: (err, message: any) => void): any

    rpcServer(queueName: string,
              exchangeName: string,
              routingKey: string): Promise<RegisterResource>

}
