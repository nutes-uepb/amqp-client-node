import { IOptions } from './configuration.inteface'
import { Connection } from '../infrastructure/amqp-ts'

export interface IConnectionEventBus {
    isConnected: boolean

    conn?: any

    tryConnect(vhost: string, host: string, port: number, username: string, password: string, options?: IOptions): Promise<Connection>

    closeConnection(): Promise<boolean>

}
