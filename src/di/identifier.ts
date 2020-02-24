export abstract class Identifier {
    public static readonly RABBITMQ_CONNECTION_FACT: any = Symbol.for('ConnectionFactoryRabbitMQ')
    public static readonly RABBITMQ_CONNECTION: any = Symbol.for('ConnectionRabbitMQ')
    public static readonly BUS_MESSAGE: any = Symbol.for('BusMessage')
    public static readonly CUSTOM_LOGGER: any = Symbol.for('CustomLogger')
    public static readonly RABBITMQ_MENSSAGE_SENDER: any = Symbol.for('MessageSender')
    public static readonly RABBITMQ_MENSSAGE_RECEIVER: any = Symbol.for('MessageReceiver')
    public static readonly RABBITMQ_CLIENT_REGISTER: any = Symbol.for('ClientRegister')
    public static readonly CUSTOM_EVENT_EMITTER: any = Symbol.for('CustomEventEmitter')
    public static readonly CUSTOM_EVENT_EMITTER_OPTIONS: any = Symbol.for('CustomEventEmitterOpts')
}
