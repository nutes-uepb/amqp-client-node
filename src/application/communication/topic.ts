import { ITopicDirect } from '../port/topic.direct.inteface'
import { RegisterResource } from './register.resource'
import { IConfiguration, IOptions } from '../../infrastructure/port/configuration.inteface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../di/identifier'
import { TypeCommunication } from '../port/type.communication'

@injectable()
export class Topic implements ITopicDirect {

    constructor(@inject(Identifier.TOPIC_DIRECT) private readonly _topic: ITopicDirect) {
        this._topic.typeConnection = TypeCommunication.TOPIC
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._topic.on(event, listener)
    }

    public pub(exchangeName: string, routingKey: string, message: any): Promise<boolean> {
        return this._topic.pub(exchangeName, routingKey, message)
    }

    public receiveFromYourself(value: boolean): boolean {
        return this._topic.receiveFromYourself(value)
    }

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[]): Promise<any>

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     callback: (err, message: any) => void): void

    public rpcClient(exchangeName: string, resourceName: string, parameters: any[], callback?: (err, message: any) => void): any {
        return this._topic.rpcClient(exchangeName, resourceName, parameters, callback)
    }

    public rpcServer(queueName: string, exchangeName: string, routingKey: string): Promise<RegisterResource> {
        return this._topic.rpcServer(queueName, exchangeName, routingKey)
    }

    public sub(exchangeName: string, queueName: string, routingKey: string, callback: (message: any) => void): Promise<boolean> {
        return this._topic.sub(exchangeName, queueName, routingKey, callback)
    }

    set config(value: IConfiguration | string) {
        this._topic.config = value
    }

    set options(value: IOptions) {
        this._topic.options = value
    }

}
