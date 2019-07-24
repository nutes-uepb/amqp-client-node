import { IEventBus } from '../../application/port/event.bus.interface'
import { IConnConfiguration, IConnOptions } from '../../application/port/connection.configuration.inteface'
import { IServerRegister } from '../port/rpc/server.register.interface'
import { IMessageSender } from '../port/pubsub/message.sender.interface'
import { IMessageReceiver } from '../port/pubsub/message.receiver.interface'
import { IClientRegister } from '../port/rpc/client.register.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../di/identifier'
import { CustomEventEmitter } from '../../utils/custom.event.emitter'
import { ICustomLogger } from '../../utils/custom.logger'
import { IConnection } from '../port/connection/connection.interface'

@injectable()
export class EventBus implements IEventBus {

    constructor(
        @inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
        @inject(Identifier.RABBITMQ_MENSSAGE_SENDER) private readonly _messageSender: IMessageSender,
        @inject(Identifier.RABBITMQ_MENSSAGE_RECEIVER) private readonly _messageReceiver: IMessageReceiver,
        @inject(Identifier.RABBITMQ_CLIENT_REGISTER) private readonly _clientRegister: IClientRegister,
        @inject(Identifier.RABBITMQ_SERVER_REGISTER) private readonly _serverRegister: IServerRegister,
        @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: CustomEventEmitter,
        @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger
    ) {
    }

    get clientRegister(): IClientRegister {
        return this._clientRegister
    }

    get messageReceiver(): IMessageReceiver {
        return this._messageReceiver
    }

    get messageSender(): IMessageSender {
        return this._messageSender
    }

    get serverRegister(): IServerRegister {
        return this._serverRegister
    }

    public isConnected(): boolean {
        return this._connection.isConnected
    }

    public async openConnection(): Promise<void> {
        try {
            return await this._connection.tryConnect()
        } catch (e) {
            return Promise.reject(e)
        }
    }

    public closeConnection(): Promise<boolean> {
        return this._connection.closeConnection()
    }

    public disposeConnection(): Promise<boolean> {
        return this._connection.disposeConnection()
    }

    public config(value: IConnConfiguration | string): void {
        this._connection.configurations = value
    }

    public options(value: IConnOptions) {
        this._connection.options = value
    }

    public serviceTag(tag: string): void {
        this._connection.idConnection = tag
    }

}
