import { IConnConfiguration, IConnOptions } from './port/connection.configuration.inteface'
import { Identifier } from '../di/identifier'
import { DependencyInject } from '../di/di'
import { Topic } from './communication/topic'
import { Direct } from './communication/direct'
import { IEventBus } from './port/event.bus.interface'

export class PubSub {
    private _connection: IEventBus
    private _topic: Topic
    private _direct: Direct
    private _logger

    private _initializedConnection: Promise<void>

    constructor(private _container = new DependencyInject().getContainer()) {
        this._logger = this._container.get(Identifier.CUSTOM_LOGGER)
        this._connection = this._container.get(Identifier.EVENT_BUS)
        this._topic = this._container.get(Identifier.TOPIC)
        this._direct = this._container.get(Identifier.DIRECT)
    }

    get initializedConnection(): Promise<void> {
        return this._initializedConnection
    }

    public connect(conf: IConnConfiguration | string, option?: IConnOptions): void {

        this._connection.config = conf
        this._connection.options = option

        this._initializedConnection = this._connection.openConnection()
    }

    public async close(): Promise<boolean> {
        return this._connection.closeConnection()
    }

    public async dispose(): Promise<boolean> {
        return this._connection.disposeConnection()
    }

    get topic(): Topic {
        return this._topic
    }

    get direct(): Direct {
        return this._direct
    }

    public logger(enabled: boolean, level?: string): void {
        this._logger.changeLoggerConfiguration(enabled, level)
    }
}
