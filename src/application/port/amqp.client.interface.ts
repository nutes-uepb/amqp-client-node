import { IConnectionOptions, IConnectionParams } from './connection.config.inteface'
import { IConnection } from './connection.interface'

export interface IAmqpClient {
    logger(level: string, moduleName?: string): void

    createConnection(params?: IConnectionParams | string, options?: IConnectionOptions): Promise<IConnection>
}
