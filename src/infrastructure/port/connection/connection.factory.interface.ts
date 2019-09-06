export interface IConnectionFactory {
    createConnection(url: string | object, socketOptions: any, reconnectStrategy: any): Promise<any>

    on(event: string | symbol, listener: (...args: any[]) => void): void
}

export interface ITopology {
    exchanges: { name: string, type?: string, options?: any }[]
    queues: { name: string, options?: any }[]
    bindings: { source: string, queue?: string, exchange?: string, pattern?: string, args?: any }[]
}
