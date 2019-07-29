export interface IQueueOptions {
    exclusive?: boolean;
    durable?: boolean;
    auto_delete?: boolean;
    arguments?: any;
    message_ttl?: number;
    expires?: number;
    dead_letter_exchange?: string;
    max_length?: number;
    prefetch?: number;
    no_create?: boolean;
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
