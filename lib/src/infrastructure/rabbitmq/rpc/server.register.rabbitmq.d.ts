import { IServerOptions } from '../../../application/port/communications.options.interface';
import { IBusConnection } from '../../port/connection/connection.interface';
import { IServerRegister } from '../../port/rpc/server.register.interface';
export declare class ServerRegisterRabbitmq implements IServerRegister {
    private readonly _connection;
    private readonly _queueName;
    private readonly _exchangeName;
    private readonly _routingKey;
    private readonly _options?;
    private resource_handlers;
    private consumersInitialized;
    private readonly _logger;
    constructor(_connection: IBusConnection, _queueName: string, _exchangeName: string, _routingKey: string, _options?: IServerOptions);
    start(): Promise<void>;
    addResource(resourceName: string, resource: (...any: any) => any): boolean;
    removeResource(resourceName: string): boolean;
    getAllResource(): object;
    private registerResource;
    private unregisterResource;
    private getResource;
    private registerRoutingKeyServer;
}
