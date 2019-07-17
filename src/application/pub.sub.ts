import { IConfiguration, IOptions } from '../infrastructure/port/configuration.inteface'
import { Identifier } from '../di/identifier'
import { DependencyInject } from '../di/di'
import { Topic } from './communication/topic'
import { Direct } from './communication/direct'
import { IEventBus } from '../infrastructure/port/event.bus.interface'

export class PubSub {
    private readonly _connection: IEventBus
    private readonly _topic: Topic
    private readonly _direct: Direct
    private readonly _logger

    constructor(
        conf: IConfiguration | string, option?: IOptions) {
        const container = new DependencyInject().getContainer()

        this._logger = container.get(Identifier.CUSTOM_LOGGER)

        this._connection = container.get(Identifier.EVENT_BUS)
        this._connection.config = conf
        this._connection.options = option

        this._topic = container.get(Identifier.TOPIC)

        this._direct = container.get(Identifier.DIRECT)

    }

    get topic(): Topic {
        return this._topic
    }

    get direct(): Direct {
        return this._direct
    }

    public logger(enabled: boolean, level?: string): void {
        this._logger.changeLoggerConfiguration(enabled, level)
        return
    }

    public async close(): Promise<boolean> {
        return this._connection.closeConnection()
    }

    public async dispose(): Promise<boolean> {
        return this._connection.disposeConnection()
    }
}
