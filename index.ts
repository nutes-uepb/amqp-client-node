export { amqpClient } from './src/amqp.client'
export { Message } from './src/application/message'

export { IServerRegister } from './src/application/port/server.register.interface'
export { IExchangeOptions } from './src/application/port/exchange.option.interface'
export { IQueueOptions, IActivateConsumerOptions } from './src/application/port/queue.option.interface'
export { IConnection } from './src/application/port/connection.interface'
export { IAmqpClient } from './src/application/port/amqp.client.interface'
export { IMessage, IMessageProperty, IMessageField } from './src/application/port/message.interface'
export {
    IPubExchangeOptions,
    ISubExchangeOptions,
    IClientOptions,
    IServerOptions
} from './src/application/port/communication.option.interface'
export { IConnectionParams, IConnectionOptions, ISSLOptions } from './src/application/port/connection.config.inteface'
