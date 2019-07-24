import { IEventHandler } from '../../port/pubsub/event.handler.interface'
import { Queue } from '../bus/queue'
import { Message } from '../bus/message'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { IConnection } from '../../port/connection/connection.interface'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageReceiver } from '../../port/pubsub/message.receiver.interface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { IStartConsumerResult } from '../../../application/port/queue.options.interface'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'
import { IMessage, IMessageField, IMessageProperty } from '../../../application/port/message.interface'

@injectable()
export class MessageReceiverRabbitmq implements IMessageReceiver {
    private consumersInitialized: Map<string, boolean> = new Map<string, boolean>()
    private routing_key_handlers: Map<string, IEventHandler<any>> = new Map<string, IEventHandler<any>>()

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    public async receiveRoutingKeyMessage(exchangeName: string,
                                          topicKey: string,
                                          queueName: string,
                                          callback: IEventHandler<any>,
                                          config: ICommunicationConfig): Promise<void> {
        try {

            if (!this._connection.isConnected) {
                return callback.handle(new Error('Connection Failed'), undefined)
            }

            const exchange = this._connection.getExchange(exchangeName, config)

            const queue = await this._connection.getQueue(queueName, config)

            if (await exchange.initialized) {
                this.routing_key_handlers.set(topicKey, callback)
                this._logger.info('Callback message ' + topicKey + ' registered!')
                queue.bind(exchange, topicKey)
            }

            await this.activateConsumerTopicOrDirec(queue, queueName, config.receive_from_yourself)

        } catch (err) {
            return callback.handle(err, undefined)
        }
    }

    private async activateConsumerTopicOrDirec(queue: Queue,
                                               queueName: string,
                                               receiveFromYourself: boolean = false): Promise<void> {

        if (!this.consumersInitialized.get(queueName)) {
            this.consumersInitialized.set(queueName, true)
            this._logger.info('Queue creation ' + queueName + ' realized with success!')

            await queue.activateConsumer((message: Message) => {
                // acknowledge that the message has been received (and processed)

                if (message.properties.correlationId === this._connection.idConnection &&
                    !receiveFromYourself) {
                    message.nack()
                    return
                }

                message.ack()
                this._logger.info(`Bus event message received with success!`)
                const routingKey: string = message.fields.routing_key

                for (const entry of this.routing_key_handlers.keys()) {
                    if (this.regExpr(entry, routingKey)) {
                        const event_handler: IEventHandler<any> | undefined =
                            this.routing_key_handlers.get(entry)

                        if (event_handler) {
                            const msg: IMessage = this.createMessage(message)
                            event_handler.handle(undefined, msg)
                        }
                    }
                }

            }, { noAck: false }).then((result: IStartConsumerResult) => {
                this._logger.info('Queue consumer ' + queue.name + ' successfully created! ')
            })
                .catch(err => {
                    throw err
                })
        }
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

    private createMessage(message: Message): IMessage {
        const msg = {
            properties: {
                priority: message.properties.priority,
                expiration: message.properties.expiration,
                message_id: message.properties.messageId,
                timestamp: message.properties.timestamp,
                user_id: message.properties.userId,
                app_id: message.properties.appId,
                cluster_id: message.properties.clusterId,
                cc: message.properties.cc,
                bcc: message.properties.bcc
            } as IMessageProperty,
            content: message.getContent(),
            fields: {
                consumer_tag: message.fields.consumerTag,
                delivery_tag: message.fields.deliveryTag,
                redelivered: message.fields,
                exchange: message.fields.exchange,
                routing_key: message.fields.routing_key
            } as IMessageField
        } as IMessage

        return msg
    }

}
