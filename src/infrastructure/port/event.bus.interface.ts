import { IMessageSender } from './pubsub/message.sender.interface'
import { IMessageReceiver } from './pubsub/message.receiver.interface'
import { IClientRegister } from './rpc/client.register.interface'
import { IServerRegister } from './rpc/server.register.interface'
import { IConfigurationParameters } from './configuration.inteface'

export interface IEventBus {
    messageSender: IMessageSender
    messageReceiver: IMessageReceiver
    clientRegister: IClientRegister
    serverRegister: IServerRegister

    setConfigurations(config: IConfigurationParameters)

}
