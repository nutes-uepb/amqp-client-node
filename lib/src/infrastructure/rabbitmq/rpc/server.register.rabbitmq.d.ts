import { IServerOptions } from '../../../application/port/communication.option.interface';
import { IBusConnection } from '../../port/connection/connection.interface';
import { IServerRegister } from '../../../application/port/server.register.interface';
export declare class ServerRegisterRabbitmq implements IServerRegister {
    private readonly _connection;
    private readonly _queueName;
    private readonly _exchangeName;
    private readonly _routingKeys;
    private readonly _options?;
    private resource_handlers;
    private readonly _logger;
    constructor(_connection: IBusConnection, _queueName: string, _exchangeName: string, _routingKeys: string[], _options?: IServerOptions);
    start(): Promise<void>;
    addResource(resourceName: string, resource: (...any: any) => any): boolean;
    removeResource(resourceName: string): boolean;
    getAllResource(): object;
    private registerResource;
    private unregisterResource;
    private getResource;
    private registerRoutingKeyServer;
    private routingKeyServerConsumer;
}
