import { EventBus } from '../../rabbitmq/connection/eventbus'
import { IEventHandler } from '../../rabbitmq/port/event.handler.interface'
import { IClientRequest } from '../../rabbitmq/port/resource.handler.interface'
import { Fanout } from './fanout'

export class WorkQueues extends EventBus {

    public pub(eventName: string,
               queueName: string,
               message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            if (!this.pubActived) {
                this.pubActived = true
                await this.pubconnection
                    .tryConnect(this.vhost, this.host, this.port, this.username, this.password, this.options)
                this.pubEventInitialization()
                await this.pubconnection.conn.initialized
            }

            if (this.isPubConnected) {
                this.pubconnection
                    .sendMessageWorkQueues(eventName, queueName, message).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }

    public sub(eventName: string,
               queueName: string,
               callback: (message: any) => void): Promise<boolean> {
        const eventCallback: IEventHandler<any> = {
            handle: callback
        }

        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.subActived) {
                this.subActived = true
                await this.subconnection
                    .tryConnect(this.vhost, this.host, this.port, this.username, this.password, this.options)
                this.subEventInitialization()
                await this.subconnection.conn.initialized
            }

            if (this.isSubConnected) {
                this.subconnection
                    .receiveMessageWorkQueues(eventName, queueName, eventCallback).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }

    public rpcClient(queueName: string,
                     callback: (message: any) => void,
                     resourceName: string,
                     ...any: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.clientActived) {
                this.clientActived = true
                await this.clientConnection
                    .tryConnect(this.vhost, this.host, this.port, this.username, this.password, this.options)
                this.clientEventInitialization()
                await this.clientConnection.conn.initialized
            }

            const clientRequest: IClientRequest = {
                resourceName,
                handle: any
            }

            if (this.isClientConnected) {
                this.clientConnection
                    .registerClientWorkQueues(callback, queueName, clientRequest)
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

    public rpcServer(queueName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            if (!this.serverActived) {
                this.serverActived = true
                await this.serverConnection
                    .tryConnect(this.vhost, this.host, this.port, this.username, this.password, this.options)
                this.serverEventInitialization()
                await this.serverConnection.conn.initialized
            }

            if (this.isServerConnected) {
                this.serverConnection.registerServerWorkQueues(queueName).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }
}

export const workQueues = new WorkQueues()
