import { IExchangeOptions } from './exchange.option.interface'
import { IActivateConsumerOptions, IQueueOptions } from './queue.option.interface'

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
