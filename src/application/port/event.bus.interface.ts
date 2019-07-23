import { IMessageSender } from '../../infrastructure/port/pubsub/message.sender.interface'
import { IMessageReceiver } from '../../infrastructure/port/pubsub/message.receiver.interface'
import { IClientRegister } from '../../infrastructure/port/rpc/client.register.interface'
import { IServerRegister } from '../../infrastructure/port/rpc/server.register.interface'
import { IConnConfiguration, IConnOptions } from './connection.configuration.inteface'

export interface IEventBus {
    config: IConnConfiguration | string
    options: IConnOptions
    isConnected: boolean
    messageSender: IMessageSender
    messageReceiver: IMessageReceiver
    clientRegister: IClientRegister
    serverRegister: IServerRegister

    openConnection(): Promise<void>

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

}
