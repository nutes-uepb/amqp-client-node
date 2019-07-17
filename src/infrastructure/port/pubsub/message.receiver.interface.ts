import { IEventHandler } from './event.handler.interface'

export interface IMessageReceiver {

    receiveFromYourself

    receiveMessageTopicOrDirect(type: string,
                                exchangeName: string,
                                topicKey: string,
                                queueName: string,
                                callback: IEventHandler<any>): Promise<boolean>

}
