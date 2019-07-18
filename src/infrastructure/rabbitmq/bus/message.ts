import { log } from '../connection/connection.factory.rabbitmq'
import { Exchange } from './exchange'
import { Queue } from './queue'
import * as AmqpLib from 'amqplib/callback_api'
import { IMessageInterface } from '../../port/bus/message.interface'

export class Message implements IMessageInterface {
    private _content: Buffer
    private _fields: any
    private _properties: any

    private _channel: AmqpLib.Channel // for received messages only: the channel it has been received on
    private _message: AmqpLib.Message // received messages only: original amqplib message

    constructor(content?: any, options: any = {}) {
        this._properties = options
        if (content !== undefined) {
            this.content = content
        }
    }

    set content(content: any) {
        if (content instanceof Error) {
            this.properties.type = 'error'
            this._properties.contentType = ''
            this.content = Buffer.from(JSON.stringify(content.message ))
            return
        }

        if (typeof content === 'string') {
            this._content = new Buffer(content)
        } else if (!(content instanceof Buffer)) {
            this._content = Buffer.from(JSON.stringify(content))
            this._properties.contentType = 'application/json'
        } else {
            this._content = content
        }
    }

    get content(): any {
        return this._content
    }

    public getContent(): any {
        let content = this._content.toString()

        if (this._properties.contentType === 'application/json') {
            content = JSON.parse(content)
        }

        return content
    }

    public sendTo(destination: Exchange | Queue, routingKey: string = ''): void {
        // inline function to send the message
        const sendMessage = () => {
            try {
                destination.channel.publish(exchange, routingKey, this._content, this._properties)
            } catch (err) {
                log.log('debug', 'Publish error11: ' + err.message, { module: 'amqp-ts' })
                const destinationName = destination.name
                const connection = destination.connection
                log.log('debug', 'Try to rebuild connection, before Call.', { module: 'amqp-ts' })
                connection._rebuildAll(err).then(() => {
                    log.log('debug', 'Retransmitting message.', { module: 'amqp-ts' })
                    if (destination instanceof Queue) {
                        connection.queues[destinationName].publish(this._content, this._properties)
                    } else {
                        connection.exchanges[destinationName].publish(this._content, routingKey, this._properties)
                    }

                })
            }
        }

        let exchange: string
        if (destination instanceof Queue) {
            exchange = ''
            routingKey = destination.name
        } else {
            exchange = destination.name
        }

        (destination.initialized as Promise<any>).then(sendMessage)
    }

    public ack(allUpTo?: boolean): void {
        if (this._channel !== undefined) {
            this._channel.ack(this._message, allUpTo)
        }
    }

    public nack(allUpTo?: boolean, requeue?: boolean): void {
        if (this._channel !== undefined) {
            this._channel.nack(this._message, allUpTo, requeue)
        }
    }

    public reject(requeue = false): void {
        if (this._channel !== undefined) {
            this._channel.reject(this._message, requeue)
        }
    }

    get fields() {
        return this._fields
    }

    set fields(value: any) {
        this._fields = value
    }

    get properties(): any {
        return this._properties
    }

    set properties(value: any) {
        this._properties = value
    }

    set channel(value: AmqpLib.Channel) {
        this._channel = value
    }

    set message(value: AmqpLib.Message) {
        this._message = value
    }
}
