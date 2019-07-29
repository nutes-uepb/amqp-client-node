import { Exchange } from './exchange';
import { Queue } from './queue';
import * as AmqpLib from 'amqplib/callback_api';
import { IMessageInterface } from '../../port/bus/message.interface';
export declare class Message implements IMessageInterface {
    private _content;
    private _fields;
    private _properties;
    private _channel;
    private _message;
    constructor(content?: any, options?: any);
    content: any;
    getContent(): any;
    sendTo(destination: Exchange | Queue, routingKey?: string): void;
    ack(allUpTo?: boolean): void;
    nack(allUpTo?: boolean, requeue?: boolean): void;
    reject(requeue?: boolean): void;
    fields: any;
    properties: any;
    channel: AmqpLib.Channel;
    message: AmqpLib.Message;
}
