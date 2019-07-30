export interface IQueueOptions {
    exclusive?: boolean;
    durable?: boolean;
    autoDelete?: boolean;
    arguments?: any;
    message_ttl?: number;
    expires?: number;
    deadLetterExchange?: string;
    maxLength?: number;
    prefetch?: number;
    noCreate?: boolean;
}
export interface IStartConsumerOptions {
    rawMessage?: boolean;
    consumerTag?: string;
    noLocal?: boolean;
    noAck?: boolean;
    exclusive?: boolean;
    priority?: number;
    arguments?: object;
}
export interface IActivateConsumerOptions {
    consumerTag?: string;
    noLocal?: boolean;
    noAck?: boolean;
    exclusive?: boolean;
    priority?: number;
    arguments?: object;
}
export interface IStartConsumerResult {
    consumerTag: string;
}
export interface IQueueInitializeResult {
    queue: string;
    messageCount: number;
    consumerCount: number;
}
export interface IDeleteResult {
    messageCount: number;
}
