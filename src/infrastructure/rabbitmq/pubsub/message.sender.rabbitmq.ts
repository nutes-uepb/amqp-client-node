import { Message } from '../bus/message'
import { IMessage } from '../../port/pubsub/message.interface'
import { inject, injectable } from 'inversify'
import { IConnection } from '../../port/connection/connection.interface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageSender } from '../../port/pubsub/message.sender.interface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

@injectable()
export class MessageSenderRabbitmq implements IMessageSender {

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    public async sendRoutingKeyMessage(exchangeName: string,
                                       topicKey: string,
                                       message: any,
                                       config: ICommunicationConfig): Promise<void> {
        try {

            if (!this._connection.isConnected) {
                console.log('quebrou')
                return Promise.reject(new Error('Connection Failed'))
            }

            const msg = await this.createMessage(message)

            const exchange = this._connection.getExchange(exchangeName, config)

            if (await exchange.initialized) {
                exchange.send(msg, topicKey)
                this._logger.info('Bus event message sent with success!')
            }

            return Promise.resolve()
        } catch (err) {
            return Promise.reject(err)
        }
    }

    private createMessage(message: any,
                          eventName?: string): Promise<Message> {
        try {
            const msg: IMessage = {
                timestamp: new Date().toISOString(),
                body: message
            }

            if (eventName)
                msg.eventName = eventName

            if (!this._connection.idConnection)
                this._connection.idConnection = 'id-' + Math.random().toString(36).substr(2, 16)

            const rabbitMessage: Message = new Message(msg)
            rabbitMessage.properties.appId = this._connection.idConnection

            return Promise.resolve(rabbitMessage)

        } catch (err) {
            return Promise.reject(err)
        }
    }

}
