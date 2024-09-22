import { Exchange } from '../../infrastructure/rabbitmq/bus/exchange'
import { Queue } from '../../infrastructure/rabbitmq/bus/queue'
import { Channel, Message } from 'amqplib/callback_api'


export interface IField {
    consumerTag?: string
    deliveryTag?: string
    redelivered?: boolean
    exchange?: string
    routingKey?: string
}


export interface IBusMessage {
    contentBuffer: any
    fields: IField
    properties: any
    channel: Channel
    message: Message
    content: any

    sendTo(destination: Exchange | Queue, routingKey: string): void

    ack(allUpTo?: boolean): void

    ack(message: Message, channel: Channel, noAck: boolean, allUpTo?: boolean): void

    nack(allUpTo?: boolean, requeue?: boolean): void

    nack(message: Message, channel: Channel, allUpTo?: boolean, requeue?: boolean): void

    reject(requeue: boolean): void

    reject(message: Message, channel: Channel, requeue: boolean): void

}
