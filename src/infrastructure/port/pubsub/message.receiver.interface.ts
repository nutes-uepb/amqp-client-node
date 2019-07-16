import { IEventHandler } from './event.handler.interface'
import { IConnectionBase } from '../configuration.inteface'

export interface IMessageReceiver extends IConnectionBase {

    receiveFromYourself

    receiveMessageTopicOrDirect(type: string,
                                exchangeName: string,
                                topicKey: string,
                                queueName: string,
                                callback: IEventHandler<any>): Promise<boolean>

}
