import 'reflect-metadata'
import { Container } from 'inversify'
import { Identifier } from './identifier'
import { IBusConnection } from '../infrastructure/port/connection/connection.interface'
import { ConnectionRabbitMQ } from '../infrastructure/rabbitmq/connection/connection.rabbitmq'
import { IConnectionFactory } from '../infrastructure/port/connection/connection.factory.interface'
import { CustomLogger, ICustomLogger } from '../utils/custom.logger'
import { IMessageReceiver } from '../infrastructure/port/pubsub/message.receiver.interface'
import { MessageReceiverRabbitmq } from '../infrastructure/rabbitmq/pubsub/message.receiver.rabbitmq'
import { IMessageSender } from '../infrastructure/port/pubsub/message.sender.interface'
import { MessageSenderRabbitmq } from '../infrastructure/rabbitmq/pubsub/message.sender.rabbitmq'
import { IClientRegister } from '../infrastructure/port/rpc/client.register.interface'
import { ClientRegisterRabbitmq } from '../infrastructure/rabbitmq/rpc/client.register.rabbitmq'
import { CustomEventEmitter, ICustomEventEmitter } from '../utils/custom.event.emitter'
import { ConnectionFactoryRabbitMQ } from '../infrastructure/rabbitmq/connection/connection.factory.rabbitmq'
import { BusMessage } from '../infrastructure/rabbitmq/bus/bus.message'
import { IBusMessage } from '../application/port/bus.message.inteface'

class DependencyInject {
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
        this.container.bind<IMessageSender>(Identifier.RABBITMQ_MENSSAGE_SENDER)
            .to(MessageSenderRabbitmq)
        this.container.bind<IMessageReceiver>(Identifier.RABBITMQ_MENSSAGE_RECEIVER)
            .to(MessageReceiverRabbitmq)
        this.container.bind<IClientRegister>(Identifier.RABBITMQ_CLIENT_REGISTER)
            .to(ClientRegisterRabbitmq)

        this.container.bind<IConnectionFactory>(Identifier.RABBITMQ_CONNECTION_FACT)
            .to(ConnectionFactoryRabbitMQ)
        this.container.bind<IBusConnection>(Identifier.RABBITMQ_CONNECTION)
            .to(ConnectionRabbitMQ)

        this.container.bind<ICustomEventEmitter>(Identifier.CUSTOM_EVENT_EMITTER)
            .to(CustomEventEmitter)
        this.container.bind<ICustomLogger>(Identifier.CUSTOM_LOGGER)
            .to(CustomLogger).inSingletonScope()

        this.container.bind<IBusMessage>(Identifier.BUS_MESSAGE)
            .to(BusMessage)
    }
}

export const DI = new DependencyInject().getContainer()
