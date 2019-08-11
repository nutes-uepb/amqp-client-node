import { IMessage, IMessageField, IMessageProperty } from './port/message.interface'
import { IBusMessage } from './port/bus.message.inteface'
import { DI } from '../di/di'
import { Identifier } from '../di/identifier'

export class Message implements IMessage {
    private _content?: any
    private _properties?: IMessageProperty
    private readonly _fields: IMessageField
    private _messageBus: IBusMessage

    constructor(content?: any, properties?: IMessageProperty) {
        this._messageBus = DI.get(Identifier.BUS_MESSAGE)

        this._fields = {} as IMessageField
        this._content = content ? content : ''
        this.properties = properties ? properties : {}
    }

    get content(): any {
        return this._content
    }

    set content(value: any) {
        this._content = value
    }

    get properties(): IMessageProperty {
        return this._properties
    }

    set properties(value: IMessageProperty) {
        this._properties = value
    }

    get fields(): IMessageField {
        return this._fields
    }

    public ack(allUpTo?: boolean): void {
        this._messageBus.ack(this, this._fields.channel, this.fields.noAck, allUpTo)
    }

    public nack(allUpTo?: boolean, requeue?: boolean): void {
        this._messageBus.nack(this, this._fields.channel, allUpTo, requeue)
    }

    public reject(requeue): void {
        this._messageBus.reject(this, this._fields.channel, requeue)
    }
}
