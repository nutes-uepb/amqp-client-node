import {IOptions} from './configuration.inteface'
import { Connection } from 'amqp-ts'
import { IEventHandler } from './event.handler.interface'

export interface IConnectionEventBus {
    isConnected: boolean

    conn?: any

    tryConnect(host: string, port: number, username: string, password: string, options?: IOptions): Promise<Connection>

    closeConnection(): Promise<boolean>

    sendMessage(exchangeName: string, topicKey: string, message: any): Promise<boolean>

    receiveMessage(exchangeName: string, queueName: string, topicKey: string, callback: IEventHandler<any>): Promise<boolean>
}
