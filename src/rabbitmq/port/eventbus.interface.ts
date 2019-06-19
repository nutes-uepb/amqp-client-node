export interface IEventbusInterface {
    isSubConnected: boolean

    isPubConnected: boolean

    dispose(): Promise<boolean>

    receiveFromYourself(value: boolean): boolean

    logger(enabled: boolean, level?: string): boolean

    pub(...any: any): Promise<boolean>

    sub(...any: any): Promise<boolean>

    rpcServer(...any:any): Promise<boolean>

    rpcClient(...any:any): Promise<boolean>
}
