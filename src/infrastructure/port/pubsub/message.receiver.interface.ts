import { IEventHandler } from './event.handler.interface'
import { ISubExchangeOptions } from '../../../application/port/communications.options.interface'
import { IBusConnection } from '../connection/connection.interface'

export interface IMessageReceiver {

    connection: IBusConnection

    receiveRoutingKeyMessage(queueName: string,
                             exchangeName: string,
                             topicKey: string,
                             callback: IEventHandler<any>,
                             options?: ISubExchangeOptions): Promise<void>

}
