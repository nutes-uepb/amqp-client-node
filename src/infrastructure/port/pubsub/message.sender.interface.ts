import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

export interface IMessageSender {

    sendRoutingKeyMessage(exchangeName: string,
                          topicKey: string,
                          message: any,
                          config: ICommunicationConfig): Promise<boolean>

}
