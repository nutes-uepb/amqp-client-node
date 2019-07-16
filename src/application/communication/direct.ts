import { ITopicDirect } from '../port/topic.direct.inteface'
import { RegisterResource } from './register.resource'
import { IConfiguration, IOptions } from '../../infrastructure/port/configuration.inteface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../di/identifier'
import { TypeCommunication } from '../port/type.communication'

@injectable()
export class Direct implements ITopicDirect {

    constructor(@inject(Identifier.TOPIC_DIRECT) private readonly _direct: ITopicDirect) {
        this._direct.typeConnection = TypeCommunication.DIRECT
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): void {
        this._direct.on(event, listener)
    }

    public pub(exchangeName: string, routingKey: string, message: any): Promise<boolean> {
        return this._direct.pub(exchangeName, routingKey, message)
    }

    public receiveFromYourself(value: boolean): boolean {
        return this._direct.receiveFromYourself(value)
    }

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[]): Promise<any>

    public rpcClient(exchangeName: string,
                     resourceName: string,
                     parameters: any[],
                     callback: (err, message: any) => void): void

    public rpcClient(exchangeName: string, resourceName: string, parameters: any[], callback?: (err, message: any) => void): any {
        return this._direct.rpcClient(exchangeName, resourceName, parameters, callback)
    }

    public rpcServer(queueName: string, exchangeName: string, routingKey: string): Promise<RegisterResource> {
        return this._direct.rpcServer(queueName, exchangeName, routingKey)
    }

    public sub(exchangeName: string, queueName: string, routingKey: string, callback: (message: any) => void): Promise<boolean> {
        return this._direct.sub(exchangeName, queueName, routingKey, callback)
    }

    set config(value: IConfiguration | string) {
        this._direct.config = value
    }

    set options(value: IOptions) {
        this._direct.options = value
    }

}
