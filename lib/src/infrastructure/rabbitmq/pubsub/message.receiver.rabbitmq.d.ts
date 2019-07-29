import { IEventHandler } from '../../port/pubsub/event.handler.interface';
import { IBusConnection } from '../../port/connection/connection.interface';
import { ICustomLogger } from '../../../utils/custom.logger';
import { IMessageReceiver } from '../../port/pubsub/message.receiver.interface';
import { ISubExchangeOptions } from '../../../application/port/communications.options.interface';
export declare class MessageReceiverRabbitmq implements IMessageReceiver {
    private readonly _logger;
    private consumersInitialized;
    private routing_key_handlers;
    private _connection;
    constructor(_logger: ICustomLogger);
    connection: IBusConnection;
    receiveRoutingKeyMessage(queueName: string, exchangeName: string, topicKey: string, callback: IEventHandler<any>, options?: ISubExchangeOptions): Promise<void>;
    private activateConsumerTopicOrDirec;
    private regExpr;
    private createMessage;
}
