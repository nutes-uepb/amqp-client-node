import { IOptions } from './configuration.inteface'
import { IEventHandler } from './event.handler.interface'

export interface IEventbusInterface {
    isSubConnected: boolean

    isPubConnected: boolean

    dispose(): Promise<boolean>

    receiveFromYourself(value: boolean): boolean

    logger(enabled: boolean, level?: string): boolean

    pub(...any: any): Promise<boolean>

    sub(...any: any): Promise<boolean>

    rpcServer(): Promise<boolean>

    rpcClient(resourceName: string, ...any:any): Promise<boolean>
}
