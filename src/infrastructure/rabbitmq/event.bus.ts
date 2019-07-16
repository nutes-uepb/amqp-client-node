import { IEventBus } from '../port/event.bus.interface'
import { IConfiguration, IOptions } from '../port/configuration.inteface'
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

    private _config: IConfiguration | string
    private _options: IOptions
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

    set config(value: IConfiguration) {
        this._config = value
        this._connection.configurations = this._config
    }

    set options(value: IOptions) {
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

}
