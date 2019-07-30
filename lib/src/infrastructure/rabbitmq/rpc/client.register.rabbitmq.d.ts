import { IClientRequest } from '../../port/rpc/resource.handler.interface';
import { ICustomLogger } from '../../../utils/custom.logger';
import { IBusConnection } from '../../port/connection/connection.interface';
import { IClientRegister } from '../../port/rpc/client.register.interface';
import { IClientOptions } from '../../../application/port/communications.options.interface';
import { IMessage } from '../../../application/port/message.interface';
export declare class ClientRegisterRabbitmq implements IClientRegister {
    private readonly _logger;
    private _connection;
    constructor(_logger: ICustomLogger);
    connection: IBusConnection;
    registerRoutingKeyClient(exchangeName: string, resource: IClientRequest, options?: IClientOptions): Promise<IMessage>;
}
