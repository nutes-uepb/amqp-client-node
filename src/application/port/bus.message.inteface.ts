import { Exchange } from '../../infrastructure/rabbitmq/bus/exchange'
import { Queue } from '../../infrastructure/rabbitmq/bus/queue'
import { Channel, Message } from 'amqplib/callback_api'
import { IMessage } from './message.interface'

export interface IBusMessage {
    contentBuffer: any
    fields: any
    properties: any
    channel: Channel
    message: Message
    content: any

    sendTo(destination: Exchange | Queue, routingKey: string): void

    ack(allUpTo?: boolean): void

    ack(message: Message | IMessage, channel: Channel, noAck: boolean, allUpTo?: boolean): void

    nack(allUpTo?: boolean, requeue?: boolean): void

    nack(message: Message | IMessage, channel: Channel, allUpTo?: boolean, requeue?: boolean): void

    reject(requeue: boolean): void

    reject(message: Message | IMessage, channel: Channel, requeue: boolean): void

}
