import 'reflect-metadata'
import { Container } from 'inversify'
import { Identifier } from './identifier'
import { IConnection } from '../infrastructure/port/connection/connection.interface'
import { ConnectionRabbitMQ } from '../infrastructure/rabbitmq/connection/connection.rabbitmq'
import { IConnectionFactory } from '../infrastructure/port/connection/connection.factory.interface'
import { ConnectionFactoryRabbitMQ } from '../infrastructure/rabbitmq/connection/connection.factory.rabbitmq'
import { CustomLogger, ICustomLogger } from '../utils/custom.logger'
import { Topic } from '../application/communication/topic'
import { ITopic } from '../application/port/topic.inteface'
import { IMessageReceiver } from '../infrastructure/port/pubsub/message.receiver.interface'
import { MessageReceiverRabbitmq } from '../infrastructure/rabbitmq/pubsub/message.receiver.rabbitmq'
import { IMessageSender } from '../infrastructure/port/pubsub/message.sender.interface'
import { MessageSenderRabbitmq } from '../infrastructure/rabbitmq/pubsub/message.sender.rabbitmq'
import { IClientRegister } from '../infrastructure/port/rpc/client.register.interface'
import { ClientRegisterRabbitmq } from '../infrastructure/rabbitmq/rpc/client.register.rabbitmq'
import { ServerRegisterRabbitmq } from '../infrastructure/rabbitmq/rpc/server.register.rabbitmq'
import { IServerRegister } from '../infrastructure/port/rpc/server.register.interface'
import { CustomEventEmitter, ICustomEventEmitter } from '../utils/custom.event.emitter'

export class DependencyInject {
    private readonly container: Container

    /**
     * Creates an instance of DI.
     *
     * @private
     */
    public constructor() {
        this.container = new Container()
        this.initDependencies()
    }

    /**
     * Get Container inversify.
     *
     * @returns {Container}
     */
    public getContainer(): Container {
        return this.container
    }

    /**
     * Initializes injectable containers.
     *
     * @private
     * @return void
     */
    private initDependencies(): void {

        this.container.bind<IConnectionFactory>(Identifier.RABBITMQ_CONNECTION_FACT)
            .to(ConnectionFactoryRabbitMQ)
        this.container.bind<IConnection>(Identifier.RABBITMQ_CONNECTION)
            .to(ConnectionRabbitMQ).inSingletonScope()
        this.container.bind<ICustomLogger>(Identifier.CUSTOM_LOGGER)
            .to(CustomLogger).inSingletonScope()
        this.container.bind<IMessageSender>(Identifier.RABBITMQ_MENSSAGE_SENDER)
            .to(MessageSenderRabbitmq)
        this.container.bind<IMessageReceiver>(Identifier.RABBITMQ_MENSSAGE_RECEIVER)
            .to(MessageReceiverRabbitmq)
        this.container.bind<IClientRegister>(Identifier.RABBITMQ_CLIENT_REGISTER)
            .to(ClientRegisterRabbitmq)
        this.container.bind<IServerRegister>(Identifier.RABBITMQ_SERVER_REGISTER)
            .to(ServerRegisterRabbitmq)
        this.container.bind<ITopic>(Identifier.TOPIC)
            .to(Topic)

        this.container.bind<ICustomEventEmitter>(Identifier.CUSTOM_EVENT_EMITTER)
            .to(CustomEventEmitter).inSingletonScope()

    }
}
