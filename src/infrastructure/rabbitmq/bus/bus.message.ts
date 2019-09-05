// The MIT License (MIT)
//
// Copyright (c) 2015 abreits
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Exchange } from './exchange'
import { Queue } from './queue'
import * as AmqpLib from 'amqplib/callback_api'
import { injectable } from 'inversify'
import { IBusMessage } from '../../../application/port/bus.message.inteface'

@injectable()
export class BusMessage implements IBusMessage {
    private _contentBuffer: Buffer
    private _fields: any
    private _properties: any
    private _content: any

    private _acked: boolean

    private _channel: AmqpLib.Channel // for received messages only: the channel it has been received on
    private _message: AmqpLib.Message // received messages only: original amqplib message

    constructor() {
        this._acked = false
        this._properties = {}
    }

    set acked(value: boolean) {
        this._acked = value
    }

    set contentBuffer(content: any) {
        if (!content) content = ''

        if (!this._properties.contentType) this._properties.contentType = 'text/plain'

        if (content instanceof Error) {
            this.properties.type = 'error'
            this._contentBuffer = Buffer.from(content.message ? content.toString() : 'Error')
        } else if (typeof content === 'string') {
            this._contentBuffer = Buffer.from(content)
        } else if (!(content instanceof Buffer)) {
            this._contentBuffer = Buffer.from(JSON.stringify(content))
            this._properties.contentType = 'application/json'
        } else {
            this._contentBuffer = content
        }

        let parseContent = this._contentBuffer.toString()
        if (this._properties.contentType === 'application/json') {
            parseContent = JSON.parse(parseContent)
        }
        this._content = parseContent
    }

    get contentBuffer(): any {
        return this._contentBuffer
    }

    get content(): any {
        let parseContent = this._contentBuffer.toString()
        if (this._properties.contentType === 'application/json') {
            parseContent = JSON.parse(parseContent)
        }
        this._content = parseContent
        return this._content
    }

    set content(value: any) {
        this._content = value
        this.contentBuffer = value
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
        if (value) this._properties = { ...this._properties, ...value }
    }

    set channel(value: AmqpLib.Channel) {
        this._channel = value
    }

    get channel(): AmqpLib.Channel {
        return this._channel
    }

    set message(value: AmqpLib.Message) {
        this._message = value
    }

    public sendTo(destination: Exchange | Queue, routingKey: string = ''): void {
        // inline function to send the message
        const sendMessage = () => {
            try {
                destination.channel.publish(exchange, routingKey, this._contentBuffer, this._properties)
            } catch (err) {
                // Publish error
                const destinationName = destination.name
                const connection = destination.connection
                // Try to rebuild connection, before Call.
                connection._rebuildAll(err).then(() => {
                    // Retransmitting message.
                    if (destination instanceof Queue) {
                        connection.queues[destinationName].publish(this._contentBuffer, this._properties)
                    } else {
                        connection.exchanges[destinationName].publish(this._contentBuffer, routingKey, this._properties)
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

    public ack(allUpTo?: boolean): void

    public ack(message: AmqpLib.Message, channel: AmqpLib.Channel, noAck: boolean, allUpTo?: boolean): void

    public ack(message: AmqpLib.Message | boolean, channel?: AmqpLib.Channel, noAck?: boolean, allUpTo?: boolean): void {
        if (typeof message === 'boolean') {
            if (this._channel !== undefined && !this._acked) {
                this._acked = true
                this._channel.ack(this._message, allUpTo)
            }
            return
        }

        if (channel !== undefined && !noAck) {
            channel.ack(message, allUpTo)
        }
    }

    public nack(allUpTo?: boolean, requeue?: boolean): void

    public nack(message: AmqpLib.Message, channel: AmqpLib.Channel, allUpTo?: boolean, requeue?: boolean): void

    public nack(message: AmqpLib.Message | boolean, channel: AmqpLib.Channel, allUpTo?: boolean, requeue?: boolean): void {
        if (typeof message === 'boolean') {
            if (this._channel !== undefined) {
                this._channel.nack(this._message, allUpTo, requeue)
            }
            return
        }
        if (channel !== undefined) {
            channel.nack(message, allUpTo, requeue)
        }
    }

    public reject(requeue: boolean): void

    public reject(message: AmqpLib.Message, channel: AmqpLib.Channel, requeue: boolean): void

    public reject(message: AmqpLib.Message | boolean, channel?: AmqpLib.Channel, requeue = false): void {
        if (typeof message === 'boolean') {
            if (this._channel !== undefined) {
                this._channel.reject(this._message, requeue)
            }
            return
        }
        if (channel !== undefined) {
            channel.reject(message, requeue)
        }
    }
}
