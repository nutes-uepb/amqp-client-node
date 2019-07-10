import { EventEmitter } from 'events'
import { injectable, decorate } from 'inversify'

decorate(injectable(), EventEmitter)

@injectable()
export class CustomEventEmitter extends EventEmitter implements ICustomEventEmitter{

    constructor(){
        super()
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener)
    }

    public emit(event: string | symbol, ...args): boolean {
        return super.emit(event, ...args)
    }
}

export interface ICustomEventEmitter {
    on(event: string | symbol, listener: (...args: any[]) => void): this

    emit(event: string | symbol, ...args: any[]): boolean
}
