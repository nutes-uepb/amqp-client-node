export interface IExchangeDeclarationOptions {
    durable?: boolean
    internal?: boolean
    autoDelete?: boolean
    alternateExchange?: string
    arguments?: any
    noCreate?: boolean
}

export interface IExchangeInitializeResult {
    exchange: string
}
