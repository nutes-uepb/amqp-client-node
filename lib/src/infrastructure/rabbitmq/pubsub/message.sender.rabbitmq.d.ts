import { IBusConnection } from '../../port/connection/connection.interface';
import { ICustomLogger } from '../../../utils/custom.logger';
import { IMessageSender } from '../../port/pubsub/message.sender.interface';
import { IPubExchangeOptions } from '../../../application/port/communications.options.interface';
import { IMessage } from '../../../application/port/message.interface';
export declare class MessageSenderRabbitmq implements IMessageSender {
    private readonly _logger;
    private _connection;
    constructor(_logger: ICustomLogger);
    connection: IBusConnection;
    sendRoutingKeyMessage(exchangeName: string, routingKey: string, message: IMessage, options?: IPubExchangeOptions): Promise<void>;
}
