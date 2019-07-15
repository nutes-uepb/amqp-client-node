import { IConfiguration, IOptions } from '../infrastructure/port/configuration.inteface'
import { Identifier } from '../di/identifier'
import { DependencyInject } from '../di/di'
import { Topic } from './communication/topic'
import { Direct } from './communication/direct'

export class PubSub {
    private readonly _topic: Topic
    private readonly _direct: Direct
    private readonly _logger

    constructor(
        conf: IConfiguration | string, option?: IOptions) {
        const container = new DependencyInject().getContainer()

        this._logger = container.get(Identifier.CUSTOM_LOGGER)

        this._topic = container.get(Identifier.TOPIC)
        this._topic.config = conf
        this._topic.options = option

        this._direct = container.get(Identifier.DIRECT)
        this._direct.config = conf
        this._direct.options = option

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

}
