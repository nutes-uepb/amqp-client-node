import { IOptions } from './configuration.inteface'
import { IEventHandler } from './event.handler.interface'

export interface IEventbusInterface {
    isSubConnected: boolean

    isPubConnected: boolean

    dispose(): Promise<boolean>

    receiveFromYourself(value: boolean): boolean

    logger(enabled: boolean, level?: string): boolean
}
