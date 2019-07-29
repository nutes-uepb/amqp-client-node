import { Message } from '../bus/message'
import { inject, injectable } from 'inversify'
import { IBusConnection } from '../../port/connection/connection.interface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageSender } from '../../port/pubsub/message.sender.interface'
import { IMessage } from '../../../application/port/message.interface'
import { IPubExchangeOptions } from '../../../application/port/communications.options.interface'

@injectable()
export class MessageSenderRabbitmq implements IMessageSender {

    private _connection: IBusConnection

    constructor(@inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger) {
    }

    set connection(value: IBusConnection) {
        this._connection = value
    }

    public async sendRoutingKeyMessage(exchangeName: string,
                                       topicKey: string,
                                       message: any,
                                       options?: IPubExchangeOptions): Promise<void> {
        try {

            if (this._connection && !this._connection.isConnected) {
                return Promise.reject(new Error('Connection Failed'))
            }

            let exchangeOptions

            if (options) exchangeOptions = options.exchange

            const msg = await this.createMessage(message)

            const exchange = this._connection.getExchange(exchangeName, exchangeOptions)

            await exchange.initialized

            exchange.send(msg, topicKey)
            this._logger.info('Bus event message sent with success!')

            return Promise.resolve()
        } catch (err) {
            return Promise.reject(err)
        }
    }

    private createMessage(message: IMessage,
                          eventName?: string): Promise<Message> {
        try {

            if (!this._connection.idConnection)
                this._connection.idConnection = 'id-' + Math.random().toString(36).substr(2, 16)

            const rabbitMessage: Message = new Message(message.content, message.properties)

            rabbitMessage.properties = {
                ...message.properties,
                correlationId: this._connection.idConnection,
                messageId: message.properties.message_id,
                userId: message.properties.user_id,
                appId: message.properties.app_id,
                clusterId: message.properties.cluster_id
            }

            return Promise.resolve(rabbitMessage)

        } catch (err) {
            return Promise.reject(err)
        }
    }

}
