import { IExchangeOptions } from './exchange.options.interface'
import { IActivateConsumerOptions, IQueueOptions } from './queue.options.interface'

export interface IPubExchangeOptions {
    exchange?: IExchangeOptions,
}

export interface ISubExchangeOptions {
    exchange?: IExchangeOptions,
    queue?: IQueueOptions,
    consumer?: IActivateConsumerOptions
    receiveFromYourself?: boolean
}

export interface IClientOptions {
    exchange?: IExchangeOptions,
    rcpTimeout?: number
}

export interface IServerOptions {
    exchange?: IExchangeOptions,
    queue?: IQueueOptions
    consumer?: IActivateConsumerOptions
}
