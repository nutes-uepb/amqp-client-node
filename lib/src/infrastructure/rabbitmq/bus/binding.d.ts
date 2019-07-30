import { Queue } from './queue';
import { Exchange } from './exchange';
import { IBinding } from '../../port/bus/binding.interface';
export declare class Binding implements IBinding {
    private _initialized;
    private readonly _source;
    private readonly _destination;
    private readonly _pattern;
    private readonly _args;
    constructor(destination: Exchange | Queue, source: Exchange, pattern?: string, args?: any);
    readonly initialized: Promise<IBinding>;
    readonly source: Exchange;
    readonly destination: Exchange | Queue;
    initialize(): void;
    delete(): Promise<void>;
    static id(destination: Exchange | Queue, source: Exchange, pattern?: string): string;
    static removeBindingsContaining(connectionPoint: Exchange | Queue): Promise<any>;
}
