import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'
import { Channel, Message } from 'amqplib/callback_api'

export interface IBusMessage {
    contentBuffer: any
    fields: any
    properties: any
    channel: Channel
    message: Message
    content: any

    sendTo(destination: Exchange | Queue, routingKey: string): void

    ack(allUpTo?: boolean): void

    nack(allUpTo?: boolean, requeue?: boolean): void

    reject(requeue): void

}
