export interface IMessage {
    content?: any;
    fields?: IMessageField;
    properties?: IMessageProperty;
    ack?(allUpTo?: boolean): void;
    nack?(allUpTo?: boolean, requeue?: boolean): void;
    reject?(requeue: any): void;
}
export interface IMessageProperty {
    priority?: number;
    expiration?: string;
    messageId?: string;
    timestamp?: number;
    userId?: string;
    appId?: string;
    clusterId?: string;
    cc?: string | string[];
    bcc?: string | string[];
}
export interface IMessageField {
    consumerTag?: string;
    deliveryTag?: string;
    redelivered?: boolean;
    exchange?: string;
    routingKey?: string;
}
