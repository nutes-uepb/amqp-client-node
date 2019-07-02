import { EventBus } from '../../rabbitmq/connection/eventbus'
import { IEventHandler } from '../../rabbitmq/port/event.handler.interface'
import { IClientRequest } from '../../rabbitmq/port/resource.handler.interface'
import { RegisterResource } from './register.resource'
import { Direct } from './direct'

export class Topic extends EventBus {

    private readonly typeConnection = 'topic'

    public pub(exchangeName: string, routingKey: string, message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            if (!this.pubActived) {
                this.pubActived = true
                await this.pubconnection
                    .tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.pubEventInitialization()
                await this.pubconnection.conn.initialized
            }

            if (this.isPubConnected) {
                this.pubconnection.
                sendMessageTopicOrDirec(this.typeConnection, exchangeName, routingKey, message)
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
                    queueName, eventCallback).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            } else {
                return resolve(false)
            }
        })
    }

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     timeout: number): Promise<any>;

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     timeout: number,
                     callback: (err, message: any) => void): void;

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     timeout: number,
                     callback?: (err, message: any) => void): any {

        if (callback){
            this.rpcClientCallback(exchangeName, resourceName, parameters, timeout, callback)
            return
        }else {
            return this.rpcClientPromise(exchangeName, resourceName, parameters, timeout)
        }
    }

    private async rpcClientCallback(
                                    exchangeName: string,
                                    resourceName: string,
                                    parameters: any[],
                                    timeout: number,
                                    callback: (err, message: any) => void): Promise<void> {

        if (!this.clientActived) {
            this.clientActived = true
            try {
                await this.clientConnection
                    .tryConnect(this.host, this.port, this.username, this.password, this.options)
                this.clientEventInitialization()
                await this.clientConnection.conn.initialized
            } catch (err) {
                this.clientActived = false
                return callback(err, undefined)
            }
        }

        const clientRequest: IClientRequest = {
            resourceName,
            handle: parameters
        }

        if (this.isClientConnected) {
            this.clientConnection
                .registerClientDirectOrTopic(this.typeConnection, timeout, exchangeName, clientRequest, callback)
                .then((result) => {
                    callback(undefined, result)
                }).catch(err => {
                    callback(err, undefined)
                })
        } else {
            return callback(new Error('Connection not stabilized'), undefined)
        }

    }

    private rpcClientPromise(
                             exchangeName: string,
                             resourceName: string,
                             parameters: any[],
                             timeout: number): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            if (!this.clientActived) {
                this.clientActived = true
                try{
                    await this.clientConnection
                        .tryConnect(this.host, this.port, this.username, this.password, this.options)
                    this.clientEventInitialization()
                    await this.clientConnection.conn.initialized
                }catch (err) {
                    this.clientActived = false
                    return reject(err)
                }
            }

            const clientRequest: IClientRequest = {
                resourceName,
                handle: parameters
            }

            if (this.isClientConnected) {
                this.clientConnection
                    .registerClientDirectOrTopic(this.typeConnection, timeout, exchangeName, clientRequest)
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
                     routingKey: string): Promise<RegisterResource> {
        return new Promise<RegisterResource >(async (resolve, reject) => {

            if (!this.serverActived) {
                this.serverActived = true

                try{
                    await this.serverConnection
                        .tryConnect(this.host, this.port, this.username, this.password, this.options)
                    this.serverEventInitialization()
                    await this.serverConnection.conn.initialized
                }catch (err) {
                    this.serverActived = false
                    return reject(err)
                }

            }

            if (this.isServerConnected) {
                this.serverConnection
                    .registerServerDirectOrTopic(this.typeConnection, exchangeName, routingKey, queueName)
                    .then(result => {
                    return resolve(new RegisterResource(this.serverConnection, queueName))
                })
                    .catch(err => {
                    return reject(err)
                })
            } else {
                return reject (new Error('Connection not stabilized'))
            }
        })
    }
}

export const topic = new Topic()
