import { IOptions } from './configuration.inteface'
import { Connection } from 'amqp-ts'

export interface IConnectionEventBus {
    isConnected: boolean

    conn?: any

    tryConnect(host: string, port: number, username: string, password: string, options?: IOptions): Promise<Connection>

    closeConnection(): Promise<boolean>

    // sendMessage(type: string, exchangeName: string, topicKey: string, queueName: string, message: any, eventName?: string): Promise<boolean>

    // receiveMessage(type: string, exchangeName: string, topicKey: string, queueName: string, callback: IEventHandler<any>, eventName: string): Promise<boolean>
}
