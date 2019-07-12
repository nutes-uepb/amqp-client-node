import { Message } from '../bus/message'
import { IMessage } from '../../port/pubsub/message.interface'
import { inject, injectable } from 'inversify'
import { IConnection } from '../../port/connection/connection.interface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageSender } from '../../port/pubsub/message.sender.interface'
import { IConfigurationParameters } from '../../port/configuration.inteface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'

@injectable()
export class MessageSenderRabbitmq implements IMessageSender {

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {
    }

    public sendMessageTopicOrDirec(type: string,
                                   exchangeName: string,
                                   topicKey: string,
                                   message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (!this._connection.startingConnection) {
                    await this._connection.tryConnect()
                }

                if (!this._connection.isConnected)
                    return resolve(false)

                const msg = await this.createMessage(message)

                const exchange = this._connection.getExchange(exchangeName, type)

                if (await exchange.initialized) {
                    exchange.send(msg, topicKey)
                    this._logger.info('Bus event message sent with success!')
                }

                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public closeConnection(): Promise<boolean> {
        return this._connection.closeConnection()
    }

    private createMessage(message: any,
                          eventName?: string): Promise<Message> {
        return new Promise<Message>(async (resolve, reject) => {
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

                return resolve(rabbitMessage)

            } catch (err) {
                return reject(err)
            }
        })
    }

}
