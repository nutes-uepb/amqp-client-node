import { IConnectionOptions, IConnectionParams } from './application/port/connection.config.inteface';
import { IConnection } from './application/port/connection.interface';
declare class PubSub {
    private _logger;
    constructor();
    logger(enabled: boolean, level?: string): void;
    createConnetion(params?: IConnectionParams | string, options?: IConnectionOptions): Promise<IConnection>;
}
export declare const pubSub: PubSub;
export {};
