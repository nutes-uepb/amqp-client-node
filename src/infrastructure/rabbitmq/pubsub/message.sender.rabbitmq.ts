import { inject, injectable } from 'inversify'
import { IBusConnection } from '../../port/connection/connection.interface'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IMessageSender } from '../../port/pubsub/message.sender.interface'
import { IPubExchangeOptions } from '../../../application/port/communication.option.interface'
import { IMessage } from '../../../application/port/message.interface'
import { BusMessage } from '../bus/bus.message'
import { DI } from '../../../di/di'

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

            const exchange = this._connection.getExchange(exchangeName, exchangeOptions)

            await exchange.initialized

            const msg: BusMessage = DI.get(Identifier.BUS_MESSAGE)
            msg.content = message.content
            msg.properties = message.properties

            msg.properties.correlationId = this._connection.connectionId

            exchange.send(msg, routingKey)
            this._logger.info('Message sent successfully!')

            return Promise.resolve()
        } catch (err) {
            return Promise.reject(err)
        }
    }
}
