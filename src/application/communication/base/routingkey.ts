import { IEventHandler } from '../../../infrastructure/port/pubsub/event.handler.interface'
import { IClientRequest } from '../../../infrastructure/port/rpc/resource.handler.interface'
import { RegisterResource } from './register.resource'
import { IMessageSender } from '../../../infrastructure/port/pubsub/message.sender.interface'
import { IMessageReceiver } from '../../../infrastructure/port/pubsub/message.receiver.interface'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IConfiguration, IOptions } from '../../../infrastructure/port/configuration.inteface'
import { IRoutingKey } from '../../port/routing.key.interface'
import { IClientRegister } from '../../../infrastructure/port/rpc/client.register.interface'
import { IServerRegister } from '../../../infrastructure/port/rpc/server.register.interface'
import { CustomEventEmitter } from '../../../utils/custom.event.emitter'
import { ETypeCommunication } from '../../port/type.communication.enum'
import { IEventBus } from '../../../infrastructure/port/event.bus.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'

@injectable()
export class Routingkey implements IRoutingKey {
    protected _typeConnection: ETypeCommunication

    private readonly _pubConnection: IMessageSender
    private readonly _subConnection: IMessageReceiver
    private readonly _clientConnection: IClientRegister
    private readonly _serverConnection: IServerRegister

    constructor(
        @inject(Identifier.EVENT_BUS) private _connection: IEventBus,
        @inject(Identifier.CUSTOM_EVENT_EMITTER) private  _emitter: CustomEventEmitter,
        @inject(Identifier.CUSTOM_LOGGER) private  _logger: ICustomLogger
    ) {
        this._pubConnection = this._connection.messageSender
        this._subConnection = this._connection.messageReceiver
        this._clientConnection = this._connection.clientRegister
        this._serverConnection = this._connection.serverRegister
    }

    set typeConnection(value: ETypeCommunication) {
        this._typeConnection = value
    }

    public receiveFromYourself(value: boolean): boolean {
        this._subConnection.receiveFromYourself = value
        return this._subConnection.receiveFromYourself
        return false
    }

    public pub(exchangeName: string, routingKey: string, message: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            this._pubConnection.sendMessageTopicOrDirec(this._typeConnection, exchangeName, routingKey, message)
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
                .receiveMessageTopicOrDirect(this._typeConnection, exchangeName, routingKey,
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
            .registerClientDirectOrTopic(this._typeConnection, exchangeName, clientRequest, callback)
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
                .registerClientDirectOrTopic(this._typeConnection, exchangeName, clientRequest)
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
                .registerServerDirectOrTopic(this._typeConnection, exchangeName, routingKey, queueName)
                .then(result => {
                    return resolve(new RegisterResource(this._serverConnection, queueName))
                })
                .catch(err => {
                    return reject(err)
                })
        })
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._emitter.on(event, listener)
    }

}
