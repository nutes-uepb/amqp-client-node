import { IOptions } from './configuration.inteface'
import { IEventHandler } from './event.handler.interface'

export interface IEventbusInterface {
    isConnected: boolean

    connect(host: string, port: number, username: string, password: string,
            options?: IOptions): Promise<boolean>

    close(): Promise<boolean>

    publish(exchangeName: string, exchangeType: string, message: any ): Promise<boolean>

    subscribe(exchangeName: string, queueName: string, routing_key: string,
              callback: IEventHandler<any>): Promise<boolean>

    receiveFromYourself(value: boolean): boolean

    loggerConnection(enabled: boolean, level?: string): boolean
}
