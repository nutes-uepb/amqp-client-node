import { Logger } from 'winston';
export declare class CustomLogger implements ICustomLogger {
    private readonly _logger;
    private _options;
    constructor();
    readonly logger: Logger;
    private internalCreateLogger;
    private initOptions;
    addTransport(transport: any): Logger;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    verbose(message: string): void;
    debug(message: string): void;
    silly(message: string): void;
    changeLoggerConfiguration(enabled: boolean, level?: string): void;
}
export interface ICustomLogger {
    logger: Logger;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    verbose(message: string): void;
    debug(message: string): void;
    silly(message: string): void;
    addTransport(transport: any): Logger;
    changeLoggerConfiguration(enabled: boolean, level?: string): void;
}
