import { IEventHandler } from '../../../infrastructure/port/pubsub/event.handler.interface'
import { IClientRequest } from '../../../infrastructure/port/rpc/resource.handler.interface'
import { RegisterResource } from './register.resource'
import { IMessageSender } from '../../../infrastructure/port/pubsub/message.sender.interface'
import { IMessageReceiver } from '../../../infrastructure/port/pubsub/message.receiver.interface'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IRoutingKey } from '../../port/routing.key.interface'
import { IClientRegister } from '../../../infrastructure/port/rpc/client.register.interface'
import { IServerRegister } from '../../../infrastructure/port/rpc/server.register.interface'
import { CustomEventEmitter } from '../../../utils/custom.event.emitter'
import { ETypeCommunication } from '../../port/type.communication.enum'
import { IEventBus } from '../../port/event.bus.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICommunicationConfig, ICommunicationOptions } from '../../port/communications.options.interface'
import { IMessage } from '../../port/message.interface'

@injectable()
export class Routingkey implements IRoutingKey {
    private _typeConnection: ETypeCommunication
    private _options: ICommunicationOptions
    private _configurations: ICommunicationConfig

    private readonly _pubConnection: IMessageSender
    private readonly _subConnection: IMessageReceiver
    private readonly _clientConnection: IClientRegister
    private readonly _serverConnection: IServerRegister

    constructor(
        @inject(Identifier.EVENT_BUS) private _connection: IEventBus,
        @inject(Identifier.CUSTOM_LOGGER) private  _logger: ICustomLogger
    ) {
        this._pubConnection = this._connection.messageSender
        this._subConnection = this._connection.messageReceiver
        this._clientConnection = this._connection.clientRegister
        this._serverConnection = this._connection.serverRegister
    }

    protected typeConnection(value: ETypeCommunication) {
        this._typeConnection = value
        this._configurations = { ...this._configurations, type: this._typeConnection }
    }

    set options(value: ICommunicationOptions) {
        this._options = value
        this._configurations = { ...this._configurations, ...this._options }
    }

    public pub(exchangeName: string, routingKey: string, message: IMessage): Promise<void> {
        return this._pubConnection.sendRoutingKeyMessage(exchangeName, routingKey, message, this._configurations)
    }

    public sub(exchangeName: string,
               queueName: string,
               routingKey: string,
               callback: (err, message: IMessage) => void): void {
        const eventCallback: IEventHandler<any> = {
            handle: callback
        }

        this._subConnection
            .receiveRoutingKeyMessage(exchangeName, routingKey, queueName,
                eventCallback, this._configurations)
    }

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[]): Promise<IMessage>

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     callback: (err, message: IMessage) => void): void

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     callback?: (err, message: IMessage) => void): any {

        if (!callback) {
            return this.rpcClientPromise(exchangeName, resourceName, parameters)
        }

        this.rpcClientCallback(exchangeName, resourceName, parameters, callback)

    }

    private rpcClientCallback(
        exchangeName: string,
        resourceName: string,
        parameters: any[],
        callback: (err, message: IMessage) => void): void {
        const clientRequest: IClientRequest = {
            resourceName,
            handle: parameters
        }

        this._clientConnection
            .registerRoutingKeyClient(exchangeName, clientRequest, this._configurations)
            .then((result) => {
                callback(undefined, result)
            })
            .catch(err => {
                callback(err, undefined)
            })
    }

    private rpcClientPromise(
        exchangeName: string,
        resourceName: string,
        parameters: any[]): Promise<IMessage> {
        return new Promise<any>(async (resolve, reject) => {
            const clientRequest: IClientRequest = {
                resourceName,
                handle: parameters
            }

            this._clientConnection
                .registerRoutingKeyClient(exchangeName, clientRequest, this._configurations)
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
                .registerRoutingKeyServer(exchangeName, routingKey, queueName, this._configurations)
                .then(result => {
                    return resolve(new RegisterResource(this._serverConnection, queueName))
                })
                .catch(err => {
                    return reject(err)
                })
        })
    }

}
