export abstract class Identifier {
    public static readonly RABBITMQ_CONNECTION_FACT: any = Symbol.for('ConnectionFactoryRabbitMQ')
    public static readonly RABBITMQ_CONNECTION: any = Symbol.for('ConnectionRabbitMQ')
    public static readonly CUSTOM_LOGGER: any = Symbol.for('CustomLogger')
    public static readonly RABBITMQ_MENSSAGE_SENDER: any = Symbol.for('MessageSender')
    public static readonly RABBITMQ_MENSSAGE_RECEIVER: any = Symbol.for('MessageReceiver')
    public static readonly RABBITMQ_CLIENT_REGISTER: any = Symbol.for('ClientRegister')
    public static readonly RABBITMQ_SERVER_REGISTER: any = Symbol.for('ServerRegister')
    public static readonly TOPIC_DIRECT: any = Symbol.for('Topic_Direct')
    public static readonly TOPIC: any = Symbol.for('Topic')
    public static readonly DIRECT: any = Symbol.for('Direct')
    public static readonly CUSTOM_EVENT_EMITTER: any = Symbol.for('CustomEventEmitter')
    public static readonly EVENT_BUS: any = Symbol.for('EventBus')
}
