import { IConnectionBase } from '../configuration.inteface'

export interface IMessageSender extends IConnectionBase {

    sendMessageTopicOrDirec(type: string,
                            exchangeName: string,
                            topicKey: string,
                            message: any): Promise<boolean>

}
