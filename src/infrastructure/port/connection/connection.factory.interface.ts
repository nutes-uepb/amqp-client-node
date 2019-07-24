export interface IConnectionFactory {
    createConnection(url: string, socketOptions: any, reconnectStrategy: any): Promise<any>
}

export interface IReconnectStrategy {
    retries: number // number of retries, 0 is forever
    interval: number // retry interval in ms
}

export interface ITopology {
    exchanges: { name: string, type?: string, options?: any }[]
    queues: { name: string, options?: any }[]
    bindings: { source: string, queue?: string, exchange?: string, pattern?: string, args?: any }[]
}
