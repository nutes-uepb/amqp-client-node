/// <reference types="node" />
import { EventEmitter } from 'events';
export declare class CustomEventEmitter extends EventEmitter implements ICustomEventEmitter {
    constructor();
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
}
export interface ICustomEventEmitter {
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    emit(event: string | symbol, ...args: any[]): boolean;
}
