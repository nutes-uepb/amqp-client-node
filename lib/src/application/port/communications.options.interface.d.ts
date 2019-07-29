import { IExchangeOptions } from './exchange.options.interface';
import { IQueueOptions } from './queue.options.interface';
export interface IPubExchangeOptions {
    exchange?: IExchangeOptions;
}
export interface ISubExchangeOptions {
    exchange?: IExchangeOptions;
    queue?: IQueueOptions;
    receive_from_yourself?: boolean;
}
export declare const defSubExchangeOptions: ISubExchangeOptions;
export interface IClientOptions {
    exchange?: IExchangeOptions;
    rcp_timeout?: number;
}
export declare const defClientOptions: IClientOptions;
export interface IServerOptions {
    exchange?: IExchangeOptions;
    queue?: IQueueOptions;
}
