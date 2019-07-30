/// <reference types="node" />
import { Binding } from '../bus/binding';
import { Queue } from '../bus/queue';
import { Exchange } from '../bus/exchange';
import * as AmqpLib from 'amqplib/callback_api';
import { IConnectionFactory, ITopology } from '../../port/connection/connection.factory.interface';
import { IExchangeOptions } from '../../../application/port/exchange.options.interface';
import { IQueueOptions } from '../../../application/port/queue.options.interface';
import { EventEmitter } from 'events';
import { IConnectionOptions } from '../../../application/port/connection.config.inteface';
export declare const log: import("winston").Logger;
export declare class ConnectionFactoryRabbitMQ extends EventEmitter implements IConnectionFactory {
    initialized: Promise<void>;
    isConnected: boolean;
    private url;
    private socketOptions;
    private reconnectStrategy;
    private connectedBefore;
    private _connection;
    private _retry;
    private _rebuilding;
    private _isClosing;
    private _exchanges;
    private _queues;
    private _bindings;
    constructor();
    createConnection(url: any, socketOptions: any, reconnectStrategy: IConnectionOptions): Promise<ConnectionFactoryRabbitMQ>;
    readonly connection: AmqpLib.Connection;
    readonly exchanges: {
        [p: string]: Exchange;
    };
    readonly queues: {
        [p: string]: Queue;
    };
    readonly bindings: {
        [p: string]: Binding;
    };
    private rebuildConnection;
    private tryToConnect;
    _rebuildAll(err: Error): Promise<void>;
    close(): Promise<void>;
    completeConfiguration(): Promise<any>;
    deleteConfiguration(): Promise<any>;
    declareExchange(name: string, type?: string, options?: IExchangeOptions): Exchange;
    declareQueue(name: string, options?: IQueueOptions): Queue;
    declareTopology(topology: ITopology): Promise<any>;
    private isEqualOptions;
}
