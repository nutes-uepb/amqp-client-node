import { IOptions } from '../../infrastructure/port/configuration.inteface'
import { ICommunication } from './communication.interface'
import { RegisterResource } from '../communication/register.resource'

export interface ITopicDirect extends ICommunication {
    setConfigurations(vhost: string,
                      host: string,
                      port: number,
                      username: string,
                      password: string,
                      options: IOptions): void

    receiveFromYourself(value: boolean): boolean

    pub(exchangeName: string,
        routingKey: string,
        message: any): Promise<boolean>

    sub(exchangeName: string,
        queueName: string,
        routingKey: string,
        callback: (message: any) => void): Promise<boolean>

    rpcClient(exchangeName: string,
              resourceName: string,
              parameters: any[],
              callback?: (err, message: any) => void): any

    rpcServer(queueName: string,
              exchangeName: string,
              routingKey: string): Promise<RegisterResource>

}
