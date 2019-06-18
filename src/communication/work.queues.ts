import { EventBus } from '../rabbitmq/connection/eventbus'
import { IWorkQueues } from './port/work.queues.interface'
import { IEventHandler } from '../rabbitmq/port/event.handler.interface'

export class WorkQueues extends EventBus implements IWorkQueues{

    private readonly typeConnection = 'work_queues'

    public pub(eventName: string, queueName: string, message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            if (!this.pubActived){
                this.pubActived = true
                await this.pubconnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.pubEventInitialization()
                await this.pubconnection.conn.initialized
            }

            if (this.isPubConnected){
                this.pubconnection.sendMessage(this.typeConnection, undefined,
                    undefined, queueName, message, eventName).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }

    public sub(eventName: string, queueName: string, callback: (message: any) => void): Promise<boolean> {
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
                this.subconnection.receiveMessage(this.typeConnection, undefined,
                    undefined, queueName, eventCallback, eventName).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }

    public rpcClient(resourceName: string, ...any: any): Promise<boolean> {
        return undefined
    }

    public rpcServer(): Promise<boolean> {
        return undefined
    }
}
