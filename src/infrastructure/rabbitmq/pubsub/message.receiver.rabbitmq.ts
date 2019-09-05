import { IEventHandler } from '../../port/pubsub/event.handler.interface'
import { Queue } from '../bus/queue'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { IBusConnection } from '../../port/connection/connection.interface'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageReceiver } from '../../port/pubsub/message.receiver.interface'
import { IActivateConsumerOptions } from '../../../application/port/queue.option.interface'
import { ISubExchangeOptions } from '../../../application/port/communication.option.interface'
import { IBusMessage } from '../../../application/port/bus.message.inteface'
import { Message } from '../../../application/message'

const defSubExchangeOptions: ISubExchangeOptions = {
    receiveFromYourself: false
}

@injectable()
export class MessageReceiverRabbitmq implements IMessageReceiver {
    private routing_key_handlers: Map<string, IEventHandler<any>> = new Map<string, IEventHandler<any>>()

    private _connection: IBusConnection

    constructor(@inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger) {
    }

    set connection(value: IBusConnection) {
        this._connection = value
    }

    public async receiveRoutingKeyMessage(queueName: string,
                                          exchangeName: string,
                                          routingKey: string,
                                          callback: IEventHandler<any>,
                                          options: ISubExchangeOptions = defSubExchangeOptions): Promise<void> {
        try {
            if (this._connection && !this._connection.isConnected) {
                return Promise.reject(new Error('Connection Failed'))
            }

            const exchange = this._connection.getExchange(exchangeName, options ? options.exchange : undefined)
            await exchange.initialized

            const queue = this._connection.getQueue(queueName, options ? options.queue : undefined)
            await queue.initialized

            this.routing_key_handlers.set(routingKey, callback)
            this._logger.info('Callback message ' + routingKey + ' registered!')

            await queue.bind(exchange, routingKey)

            await this.routingKeySubscriberConsumer(queue,
                options ? options.consumer : undefined,
                options ? options.receiveFromYourself : undefined)

            return Promise.resolve()
        } catch (err) {
            return Promise.reject(err)
        }
    }

    private async routingKeySubscriberConsumer(queue: Queue,
                                               consumer: IActivateConsumerOptions = {},
                                               receiveFromYourself: boolean = false): Promise<void> {

        if (!queue.consumerInitialized) {
            this._logger.info('Queue creation ' + queue.name + ' realized with success!')

            try {
                await queue.activateConsumer((message: IBusMessage) => {
                    // acknowledge that the message has been received (and processed)

                    if (message.properties.correlationId === this._connection.connectionId &&
                        !receiveFromYourself) {
                        return
                    }

                    const msg: Message = new Message(message.content, message.properties)
                    msg.fields.channel = message.channel
                    msg.fields.noAck = consumer.noAck
                    for (const key of Object.keys(message.fields)) {
                        msg.fields[key] = message.fields[key]
                    }

                    this._logger.info('Message received successfully!')

                    const routingKey: string = msg.fields.routingKey

                    for (const entry of this.routing_key_handlers.keys()) {
                        if (this.regExpr(entry, routingKey)) {
                            const event_handler: IEventHandler<any> | undefined =
                                this.routing_key_handlers.get(entry)
                            if (event_handler) {
                                event_handler.handle(msg)
                            }
                        }
                    }
                }, consumer)

                this._logger.info('Queue consumer ' + queue.name + ' successfully created! ')
            } catch (err) {
                return Promise.reject(err)
            }
        }
        return Promise.resolve()
    }

    private regExpr(pattern: string,
                    expression: string): boolean {
        try {
            pattern = pattern.replace(/(\*)/g, '[a-zA-Z0-9_]*')
            pattern = pattern.replace(/(\.\#)/g, '.*')
            pattern = pattern.replace(/(\#)/g, '.*')

            const regex = new RegExp(pattern)
            return regex.test(expression)
        } catch (e) {
            throw e
        }
    }
}
