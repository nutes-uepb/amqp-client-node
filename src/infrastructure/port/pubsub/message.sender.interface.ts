import { IPubExchangeOptions } from '../../../application/port/communications.options.interface'
import { IBusConnection } from '../connection/connection.interface'

export interface IMessageSender {

    connection: IBusConnection

    sendRoutingKeyMessage(exchangeName: string,
                          topicKey: string,
                          message: any,
                          options?: IPubExchangeOptions): Promise<void>

}
