import { IEventHandler } from './event.handler.interface'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'
import { Message } from '../../rabbitmq/bus/message'

export interface IMessageReceiver {

    receiveFromYourself

    receiveRoutingKeyMessage(exchangeName: string,
                             topicKey: string,
                             queueName: string,
                             callback: IEventHandler<any>,
                             config: ICommunicationConfig): void

}
