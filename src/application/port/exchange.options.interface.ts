export interface IExchangeOptions {
    durable?: boolean
    internal?: boolean
    auto_delete?: boolean
    alternate_exchange?: string
    arguments?: any
    no_create?: boolean
}

export interface IExchangeInitializeResult {
    exchange: string
}
