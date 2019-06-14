import { IOptions } from './configuration.inteface'
import { IEventHandler } from './event.handler.interface'

export interface IEventbusInterface {
    isSubConnected: boolean

    isPubConnected: boolean

    dispose(): Promise<boolean>

    pub(exchangeName: string, exchangeType: string, message: any ): Promise<boolean>

    sub(exchangeName: string, queueName: string, routing_key: string,
        callback: (message: any) => void): Promise<boolean>

    receiveFromYourself(value: boolean): boolean

    logger(enabled: boolean, level?: string): boolean
}
