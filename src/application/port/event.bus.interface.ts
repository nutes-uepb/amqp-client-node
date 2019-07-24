import { IMessageSender } from '../../infrastructure/port/pubsub/message.sender.interface'
import { IMessageReceiver } from '../../infrastructure/port/pubsub/message.receiver.interface'
import { IClientRegister } from '../../infrastructure/port/rpc/client.register.interface'
import { IServerRegister } from '../../infrastructure/port/rpc/server.register.interface'
import { IConnConfiguration, IConnOptions } from './connection.configuration.inteface'

export interface IEventBus {
    messageSender: IMessageSender
    messageReceiver: IMessageReceiver
    clientRegister: IClientRegister
    serverRegister: IServerRegister

    isConnected(): boolean

    openConnection(): Promise<void>

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

    config(value: IConnConfiguration | string): void

    options(value: IConnOptions): void

    serviceTag(tag: string): void

}
