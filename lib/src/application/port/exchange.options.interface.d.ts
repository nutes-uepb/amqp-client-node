export interface IExchangeOptions {
    type?: string;
    durable?: boolean;
    internal?: boolean;
    autoDelete?: boolean;
    alternate_exchange?: string;
    arguments?: any;
    noCreate?: boolean;
}
export interface IExchangeInitializeResult {
    exchange: string;
}
