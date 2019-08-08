import { IMessage } from './message.interface'
import {
    IClientOptions,
    IPubExchangeOptions,
    IServerOptions,
    ISubExchangeOptions
} from './communication.option.interface'
import { IServerRegister } from './server.register.interface'

export interface IConnection {

    isOpen: boolean

    close(): Promise<boolean>

    dispose(): Promise<boolean>

    on(event: string | symbol, listener: (...args: any[]) => void): void

    pub(exchangeName: string,
        routingKey: string,
        message: any,
        options?: IPubExchangeOptions): Promise<void>

    sub(queueName: string,
        exchangeName: string,
        routingKey: string,
        callback: (message: IMessage) => void,
        options?: ISubExchangeOptions): Promise<void>

    createRpcServer(queueName: string,
                    exchangeName: string,
                    routingKeys: string[],
                    options?: IServerOptions): IServerRegister

    rpcClient(exchangeName: string,
              resourceName: string,
              parameters: any[],
              optOrCall?: IClientOptions | ((err, message: any) => void),
              options?: IClientOptions): any

}
