import { IMessage, IMessageField, IMessageProperty } from './port/message.interface'
import { IBusMessage } from './port/bus.message.inteface'
import { DI } from '../di/di'
import { Identifier } from '../di/identifier'

export class Message implements IMessage {

    private _fields: IMessageField
    private _messageBus: IBusMessage

    constructor(private _content?: any, private _properties: IMessageProperty = {}) {
        this._messageBus = DI.get(Identifier.BUS_MESSAGE)

        this._fields = {} as IMessageField
    }

    get content(): any {
        return this._content
    }

    set content(value: any) {
        this._content = value
    }

    get fields(): IMessageField {
        return this._fields
    }

    get properties(): IMessageProperty {
        return this._properties
    }

    set properties(value: IMessageProperty) {
        this._properties = value
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
