import { IPubExchangeOptions } from '../../../application/port/communication.option.interface'
import { IBusConnection } from '../connection/connection.interface'

export interface IMessageSender {
    connection: IBusConnection

    sendRoutingKeyMessage(exchangeName: string,
                          topicKey: string,
                          message: any,
                          options?: IPubExchangeOptions): Promise<void>
}
