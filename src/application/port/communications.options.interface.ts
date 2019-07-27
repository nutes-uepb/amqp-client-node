import { IExchangeOptions } from './exchange.options.interface'
import { IQueueOptions } from './queue.options.interface'

export interface IPubExchangeOptions {
    exchange?: IExchangeOptions,
}

export interface ISubExchangeOptions {
    exchange?: IExchangeOptions,
    queue?: IQueueOptions,
    receive_from_yourself?: boolean
}

export const defSubExchangeOptions: ISubExchangeOptions = {
    receive_from_yourself: false
}

export interface IClientOptions {
    exchange?: IExchangeOptions,
    rcp_timeout?: number
}

export const defClientOptions: IClientOptions = {
    rcp_timeout: 5000
}

export interface IServerOptions {
    exchange?: IExchangeOptions,
    queue?: IQueueOptions
}
