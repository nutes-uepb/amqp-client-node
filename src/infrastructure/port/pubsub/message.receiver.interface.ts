import { IEventHandler } from './event.handler.interface'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

export interface IMessageReceiver {

    receiveRoutingKeyMessage(exchangeName: string,
                             topicKey: string,
                             queueName: string,
                             callback: IEventHandler<any>,
                             config: ICommunicationConfig): Promise<void>

}
