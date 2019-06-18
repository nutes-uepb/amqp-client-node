import { EventBus } from '../rabbitmq/connection/eventbus'
import { IEventHandler } from '../rabbitmq/port/event.handler.interface'
import { ITopic } from './port/topic.interface'

export class Topic extends EventBus implements ITopic{

    private readonly typeConnection = 'topic'

    public pub(exchangeName: string, topicKey: string, message: any ):  Promise<boolean>{
        return new Promise<boolean>(async (resolve, reject) => {
            if (!this.pubActived){
                this.pubActived = true
                await this.pubconnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.pubEventInitialization()
                await this.pubconnection.conn.initialized
            }

            if (this.isPubConnected){
                this.pubconnection.sendMessage(this.typeConnection, exchangeName, topicKey,
                    undefined, message).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }

    public sub(exchangeName: string, queueName: string, routing_key: string,
               callback: (message: any) => void ): Promise<boolean>{
        const eventCallback: IEventHandler<any> = {
            handle: callback
        }

        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.subActived){
                this.subActived = true
                await this.subconnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.subEventInitialization()
                await this.subconnection.conn.initialized
            }

            if (this.isSubConnected){
                this.subconnection.receiveMessage(this.typeConnection, exchangeName, routing_key,
                    queueName, eventCallback).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }
}
