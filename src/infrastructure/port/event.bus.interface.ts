import { IMessageSender } from './pubsub/message.sender.interface'
import { IMessageReceiver } from './pubsub/message.receiver.interface'
import { IClientRegister } from './rpc/client.register.interface'
import { IServerRegister } from './rpc/server.register.interface'
import { IConfiguration, IOptions } from './configuration.inteface'

export interface IEventBus {
    config: IConfiguration | string
    options: IOptions
    messageSender: IMessageSender
    messageReceiver: IMessageReceiver
    clientRegister: IClientRegister
    serverRegister: IServerRegister

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

}
