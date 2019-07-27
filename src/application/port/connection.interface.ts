import { ServerRegisterRabbitmq } from '../../infrastructure/rabbitmq/rpc/server.register.rabbitmq'
import { IMessage } from './message.interface'
import {
    IClientOptions,
    IPubExchangeOptions,
    IServerOptions,
    ISubExchangeOptions
} from './communications.options.interface'
import { IServerRegister } from '../../infrastructure/port/rpc/server.register.interface'

export interface IConnection {

    isConnected: boolean

    connect(): Promise<void>

    close(): Promise<boolean>

    dispose(): Promise<boolean>

    on(event: string | symbol, listener: (...args: any[]) => void): void

    pub(exchangeName: string,
        routingKey: string,
        message: IMessage,
        options?: IPubExchangeOptions): Promise<void>

    sub(queueName: string,
        exchangeName: string,
        routingKey: string,
        callback: (err, message: IMessage) => void,
        options?: ISubExchangeOptions): void

    createRpcServer(queueName: string,
                    exchangeName: string,
                    routingKey: string,
                    options?: IServerOptions): IServerRegister

    rpcClient(exchangeName: string,
              resourceName: string,
              parameters: any[],
              optOrCall?: IClientOptions | ((err, message: IMessage) => void),
              options?: IClientOptions): any

}
