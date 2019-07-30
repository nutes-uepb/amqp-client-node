import { Exchange } from './exchange';
import { Queue } from './queue';
import * as AmqpLib from 'amqplib/callback_api';
import { IBusMessage } from '../../port/bus/bus.message.inteface';
export declare class BusMessage implements IBusMessage {
    private _contentBuffer;
    private _fields;
    private _properties;
    private _content;
    private _channel;
    private _message;
    constructor(content?: any, options?: any);
    contentBuffer: any;
    readonly content: any;
    sendTo(destination: Exchange | Queue, routingKey?: string): void;
    ack(allUpTo?: boolean): void;
    nack(allUpTo?: boolean, requeue?: boolean): void;
    reject(requeue?: boolean): void;
    fields: any;
    properties: any;
    channel: AmqpLib.Channel;
    message: AmqpLib.Message;
}
