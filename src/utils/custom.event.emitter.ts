import { EventEmitter } from 'events'
import { decorate, inject, injectable, named } from 'inversify'
import { Identifier } from '../di/identifier'

decorate(injectable(), EventEmitter)

@injectable()
export class CustomEventEmitter extends EventEmitter implements ICustomEventEmitter {
    constructor(@inject(Identifier.CUSTOM_EVENT_EMITTER_OPTIONS) @named('options') options?: any) {
        super(options)
    }

    public on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener)
    }

    public emit(event: string | symbol, ...args): boolean {
        return super.emit(event, ...args)
    }

    public removeAllListeners(): this {
        return super.removeAllListeners()
    }
}

export interface ICustomEventEmitter {
    on(event: string | symbol, listener: (...args: any[]) => void): this

    emit(event: string | symbol, ...args: any[]): boolean

    removeAllListeners(): this
}
