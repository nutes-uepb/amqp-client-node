import { Connection } from './application/connection'
import { IConnectionOptions, IConnectionParams } from './application/port/connection.config.inteface'
import { Identifier } from './di/identifier'
import { ICustomLogger } from './utils/custom.logger'
import { DI } from './di/di'
import { IConnection } from './application/port/connection.interface'

class PubSub {

    private _logger: ICustomLogger

    constructor() {
        this._logger = DI.get(Identifier.CUSTOM_LOGGER)
    }

    public logger(enabled: boolean, level?: string): void {
        this._logger.changeLoggerConfiguration(enabled, level)
    }

    public createConnetion(params?: IConnectionParams | string, options?: IConnectionOptions): Promise<IConnection> {
        return new Connection(params, options).open()
    }

}

export const pubSub = new PubSub()
