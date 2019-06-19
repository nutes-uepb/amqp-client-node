import { EventBus } from '../../rabbitmq/connection/eventbus'
import { IEventHandler } from '../../rabbitmq/port/event.handler.interface'
import { IClientRequest } from '../../rabbitmq/port/resource.handler.interface'

export class Direct extends EventBus {

    private readonly typeConnection = 'direct'

    public pub(exchangeName: string,
               routingKey: string,
               message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            if (!this.pubActived) {
                this.pubActived = true
                await this.pubconnection
                    .tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.pubEventInitialization()
                await this.pubconnection.conn.initialized
            }

            if (this.isPubConnected) {
                this.pubconnection
                    .sendMessageTopicOrDirec(this.typeConnection, exchangeName, routingKey,
                    message)
                    .then(result => {
                    return resolve(result)
                })
                    .catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }

    public sub(exchangeName: string,
               queueName: string,
               routingKey: string,
               callback: (message: any) => void): Promise<boolean> {
        const eventCallback: IEventHandler<any> = {
            handle: callback
        }

        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.subActived) {
                this.subActived = true
                await this.subconnection
                    .tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.subEventInitialization()
                await this.subconnection.conn.initialized
            }

            if (this.isSubConnected) {
                this.subconnection
                    .receiveMessageTopicOrDirect(this.typeConnection, exchangeName, routingKey,
                    queueName, eventCallback)
                    .then(result => {
                    return resolve(result)
                })
                    .catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }

    public rpcClient(exchangeName: string,
                     routingKey: string,
                     callback: (message: any) => void,
                     resourceName: string,
                     ...any: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.clientActived) {
                this.clientActived = true
                await this.clientConnection
                    .tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.clientEventInitialization()
                await this.clientConnection.conn.initialized
            }

            const clientRequest: IClientRequest = {
                resourceName,
                handle: any
            }

            if (this.isClientConnected) {
                this.clientConnection
                    .registerClientDirectOrTopic(this.typeConnection, callback, exchangeName, routingKey, clientRequest)
                    .then(result => {
                    return resolve(result)
                })
                    .catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }

    public rpcServer(queueName: string,
                     exchangeName: string,
                     routingKey: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.serverActived) {
                this.serverActived = true
                await this.serverConnection
                    .tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.serverEventInitialization()
                await this.serverConnection.conn.initialized
            }

            if (this.isServerConnected) {
                this.serverConnection
                    .registerServerDirectOrTopic(this.typeConnection, exchangeName, routingKey, queueName)
                    .then(result => {
                    return resolve(result)
                })
                    .catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }
}
