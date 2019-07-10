import { IEventHandler } from '../../infrastructure/port/pubsub/event.handler.interface'
import { IClientRequest } from '../../infrastructure/port/rpc/resource.handler.interface'
import { RegisterResource } from './register.resource'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../di/identifier'
import { IMessageSender } from '../../infrastructure/port/pubsub/message.sender.interface'
import { IMessageReceiver } from '../../infrastructure/port/pubsub/message.receiver.interface'
import { ICustomLogger } from '../../utils/custom.logger'
import { IConfigurationParameters, IOptions } from '../../infrastructure/port/configuration.inteface'
import { ITopic } from '../port/topic.inteface'
import { IClientRegister } from '../../infrastructure/port/rpc/client.register.interface'
import { IServerRegister } from '../../infrastructure/port/rpc/server.register.interface'
import { CustomEventEmitter } from '../../utils/custom.event.emitter'

@injectable()
export class Topic implements ITopic {

    private readonly typeConnection = 'topic'

    constructor(
        @inject(Identifier.RABBITMQ_MENSSAGE_SENDER) private readonly _pubConnection: IMessageSender,
        @inject(Identifier.RABBITMQ_MENSSAGE_RECEIVER) private readonly _subConnection: IMessageReceiver,
        @inject(Identifier.RABBITMQ_CLIENT_REGISTER) private readonly _clientConnection: IClientRegister,
        @inject(Identifier.RABBITMQ_SERVER_REGISTER) private readonly _serverConnection: IServerRegister,
        @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: CustomEventEmitter,
        @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger
    ) {
    }

    get getPubConnection() {
        return this._pubConnection
    }

    get getSubConnection() {
        return this._subConnection
    }

    get getServerConnection() {
        return this._serverConnection
    }

    get getClientConnection() {
        return this._serverConnection
    }

    public setConfigurations(vhost: string,
                             host: string,
                             port: number,
                             username: string,
                             password: string,
                             options: IOptions): void {
        const config: IConfigurationParameters = {
            vhost,
            host,
            port,
            username,
            password,
            options
        }
        this._pubConnection.setConfigurations(config)
        this._subConnection.setConfigurations(config)
        this._clientConnection.setConfigurations(config)
        this._serverConnection.setConfigurations(config)
    }

    public receiveFromYourself(value: boolean): boolean {
        this._subConnection.receiveFromYourself = value
        return this._subConnection.receiveFromYourself
        return false
    }

    public pub(exchangeName: string, routingKey: string, message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            this._pubConnection.sendMessageTopicOrDirec(this.typeConnection, exchangeName, routingKey, message)
                .then(result => {
                    return resolve(result)
                })
                .catch(err => {
                    return reject(err)
                })
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
            this._subConnection
                .receiveMessageTopicOrDirect(this.typeConnection, exchangeName, routingKey,
                    queueName, eventCallback).then(result => {
                return resolve(result)
            }).catch(err => {
                return reject(err)
            })
        })
    }

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[]): Promise<any>

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     callback: (err, message: any) => void): void

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     callback?: (err, message: any) => void): any {

        if (callback) {
            this.rpcClientCallback(exchangeName, resourceName, parameters, callback)
            return
        }

        return this.rpcClientPromise(exchangeName, resourceName, parameters)

    }

    private async rpcClientCallback(
        exchangeName: string,
        resourceName: string,
        parameters: any[],
        callback: (err, message: any) => void): Promise<void> {
        const clientRequest: IClientRequest = {
            resourceName,
            handle: parameters
        }

        this._clientConnection
            .registerClientDirectOrTopic(this.typeConnection, exchangeName, clientRequest, callback)
            .then((result) => {
                callback(undefined, result)
            }).catch(err => {
            callback(err, undefined)
        })

    }

    private rpcClientPromise(
        exchangeName: string,
        resourceName: string,
        parameters: any[]): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const clientRequest: IClientRequest = {
                resourceName,
                handle: parameters
            }

            this._clientConnection
                .registerClientDirectOrTopic(this.typeConnection, exchangeName, clientRequest)
                .then(result => {
                    return resolve(result)
                })
                .catch(err => {
                    return reject(err)
                })
        })
    }

    public rpcServer(queueName: string,
                     exchangeName: string,
                     routingKey: string): Promise<RegisterResource> {
        return new Promise<RegisterResource>(async (resolve, reject) => {

            this._serverConnection
                .registerServerDirectOrTopic(this.typeConnection, exchangeName, routingKey, queueName)
                .then(result => {
                    return resolve(new RegisterResource(this._serverConnection, queueName))
                })
                .catch(err => {
                    return reject(err)
                })
        })
    }

    public dispose(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this._pubConnection.closeConnection()
                await this._subConnection.closeConnection()
                await this._clientConnection.closeConnection()
                await this._serverConnection.closeConnection()

                return resolve(true)

            } catch (err) {
                return reject(err)
            }
        })
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.on(event,listener)
    }

}
