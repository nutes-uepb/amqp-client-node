import { EventBus } from '../../rabbitmq/connection/eventbus'
import { IDirect } from '../port/direct.interface'
import { IEventHandler } from '../../rabbitmq/port/event.handler.interface'
import { IClientRequest } from '../../rabbitmq/port/resource.handler.interface'

export class Direct extends EventBus{ //  implements IDirect{

    private readonly typeConnection = 'direct'

    public pub(exchangeName: string, routingKey: string, message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            if (!this.pubActived){
                this.pubActived = true
                await this.pubconnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.pubEventInitialization()
                await this.pubconnection.conn.initialized
            }

            if (this.isPubConnected){
                this.pubconnection.sendMessage(this.typeConnection, exchangeName, routingKey,
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

    public sub(exchangeName: string, queueName: string, routingKey: string,
               callback: (message: any) => void): Promise<boolean> {
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
                this.subconnection.receiveMessage(this.typeConnection, exchangeName, routingKey,
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

    public rpcClient(callback: (message: any) => void, exchangeName: string, routingKey: string, resourceName: string, ...any: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.resourceActived){
                this.resourceActived = true
                await this.resourceConnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.resourceEventInitialization()
                await this.resourceConnection.conn.initialized
            }

            const clientRequest: IClientRequest = {
                resourceName,
                handle: any
            }

            if (this.isResourceConnected){
                this.resourceConnection.registerClientDirectOrTopic(callback, exchangeName, routingKey, clientRequest).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }

    public rpcServer(exchangeName: string,  routingKey: string, queueName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.resourceActived){
                this.resourceActived = true
                await this.resourceConnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.resourceEventInitialization()
                await this.resourceConnection.conn.initialized
            }

            if (this.isResourceConnected){
                this.resourceConnection.registerServerDirectOrTopic(this.typeConnection, exchangeName, routingKey, queueName).then(result => {
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
