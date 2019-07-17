export interface IMessageSender {

    sendMessageTopicOrDirec(type: string,
                            exchangeName: string,
                            topicKey: string,
                            message: any): Promise<boolean>

}
