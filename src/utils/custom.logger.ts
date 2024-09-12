import { createLogger, format, Logger, transports } from 'winston'
import { injectable } from 'inversify'

interface CustomLogObject {
    module?: string;
    timestamp?: string;
    level: string;
    message: string;
}

@injectable()
export class CustomLogger implements ICustomLogger {
    private readonly _logger: Logger
    private _options: any = {}
    private readonly _loggerId: string
    private _moduleName: string

    constructor() {
        this.initOptions() // initialize options logger
        this._logger = this.internalCreateLogger()
        this._loggerId = 'id-' + Math.random().toString(36).substr(2, 16)
        this._moduleName = 'amqp-client-node'
    }

    get logger(): Logger {
        return this._logger
    }

    get loggerId(): string {
        return this._loggerId
    }

    private internalCreateLogger(): Logger {
        return createLogger({
            level: 'silly', // Used by transports that do not have this configuration defined
            silent: false,
            format: format.combine(
                format.timestamp(),
                format.json()
            ),
            transports: new transports.Console(this._options),
            exitOnError: false
        })
    }

    private initOptions(): void {
        this._options = {
            level: 'error',
            silent: true,
            handleExceptions: true,
            format: format.combine(
                format.colorize(),
                format.splat(),
                format.timestamp(),
                format.printf((log: CustomLogObject) => `${log.module} @ ${log.timestamp} ${log.level}: ${log.message}`)
            )
        }
    }

    public addTransport(transport: any): Logger {
        return this._logger.add(transport)
    }

    public error(message: string): void {
        this._logger.error(message, { module: this._moduleName })
    }

    public warn(message: string): void {
        this._logger.warn(message, { module: this._moduleName })
    }

    public info(message: string): void {
        this._logger.info(message, { module: this._moduleName })
    }

    public changeConfiguration(level: string, moduleName?: string): void {
        if (moduleName) this._moduleName = moduleName
        this._options.silent = false
        this._options.level = level
        this._options.level = level

        this._logger.clear()
        this._logger.add(new transports.Console(this._options))
    }
}

/**
 * Logger interface.
 * logging levels are prioritized from 0 to 5 (highest to lowest):
 *   error: 0,
 *   warn: 1,
 *   info: 2,
 *
 * @see {@link https://github.com/winstonjs/winston#using-logging-levels} for further information.
 */
export interface ICustomLogger {
    logger: Logger

    loggerId: string

    error(message: string): void

    warn(message: string): void

    info(message: string): void

    addTransport(transport: any): Logger

    changeConfiguration(level: string, moduleName?: string): void
}
