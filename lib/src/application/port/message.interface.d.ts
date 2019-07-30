export interface IMessage {
    content?: any;
    fields?: IMessageField;
    properties?: IMessageProperty;
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
