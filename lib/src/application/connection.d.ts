import { IConnection } from './port/connection.interface';
import { IServerRegister } from '../infrastructure/port/rpc/server.register.interface';
import { IClientOptions, IPubExchangeOptions, IServerOptions, ISubExchangeOptions } from './port/communication.option.interface';
import { IMessage } from './port/message.interface';
import { IConnectionOptions, IConnectionParams } from './port/connection.config.inteface';
export declare class Connection implements IConnection {
    private readonly _pub;
    private readonly _sub;
    private readonly _rpcClient;
    private readonly _rpcServers;
    private readonly _eventBusConnection;
    constructor(parameters?: IConnectionParams | string, options?: IConnectionOptions);
    readonly isOpen: boolean;
    open(): Promise<this>;
    close(): Promise<boolean>;
    dispose(): Promise<boolean>;
    on(event: string | symbol, listener: (...args: any[]) => void): void;
    pub(exchangeName: string, routingKey: string, message: IMessage, options?: IPubExchangeOptions): Promise<void>;
    sub(queueName: string, exchangeName: string, routingKey: string, callback: (message: IMessage) => void, options?: ISubExchangeOptions): Promise<void>;
    createRpcServer(queueName: string, exchangeName: string, routingKey: string[], options?: IServerOptions): IServerRegister;
    rpcClient(exchangeName: string, resourceName: string, parameters: any[], options?: IClientOptions): Promise<IMessage>;
    rpcClient(exchangeName: string, resourceName: string, parameters: any[], callback: (err: any, message: IMessage) => void, options?: IClientOptions): void;
    private rpcClientCallback;
    private rpcClientPromise;
}
