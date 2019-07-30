import { inject, injectable } from 'inversify'
import { IBusConnection } from '../../port/connection/connection.interface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageSender } from '../../port/pubsub/message.sender.interface'
import { IPubExchangeOptions } from '../../../application/port/communications.options.interface'
import { IMessage } from '../../../application/port/message.interface'
import { BusMessage } from '../bus/bus.message'

@injectable()
export class MessageSenderRabbitmq implements IMessageSender {

    private _connection: IBusConnection

    constructor(@inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger) {
    }

    set connection(value: IBusConnection) {
        this._connection = value
    }

    public async sendRoutingKeyMessage(exchangeName: string,
                                       routingKey: string,
                                       message: IMessage,
                                       options?: IPubExchangeOptions): Promise<void> {
        try {

            if (this._connection && !this._connection.isConnected) {
                return Promise.reject(new Error('Connection Failed'))
            }

            let exchangeOptions

            if (options) exchangeOptions = options.exchange

            if (!this._connection.idConnection)
                this._connection.idConnection = 'id-' + Math.random().toString(36).substr(2, 16)

            const exchange = this._connection.getExchange(exchangeName, exchangeOptions)

            await exchange.initialized

            const msg: BusMessage = new BusMessage(message.content, message.properties)

            msg.properties.correlationId = this._connection.idConnection

            exchange.send(msg, routingKey)
            this._logger.info('Bus event message sent with success!')

            return Promise.resolve()
        } catch (err) {
            return Promise.reject(err)
        }
    }

}
