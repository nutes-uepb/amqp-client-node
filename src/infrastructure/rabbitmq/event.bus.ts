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

    private _config: IConnConfiguration | string
    private _options: IConnOptions

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

    get isConnected(): boolean {
        return this._connection.isConnected
    }

    set config(value: IConnConfiguration | string) {
        this._config = value
        this._connection.configurations = this._config
    }

    set options(value: IConnOptions) {
        this._options = value
        this._connection.options = this._options
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

    public async openConnection(): Promise<void> {
        try {
            await this._connection.tryConnect()
            return Promise.resolve()
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

}
