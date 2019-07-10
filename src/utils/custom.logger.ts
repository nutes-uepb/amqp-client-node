import { createLogger, format, Logger, transports } from 'winston'
import { injectable } from 'inversify'

@injectable()
export class CustomLogger implements ICustomLogger {
    private readonly _logger: Logger
    private _options: any = {}

    constructor() {
        this.initOptions() // initialize options logger
        this._logger = this.internalCreateLogger()
    }

    get logger(): Logger {
        return this._logger
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
                format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message}`
                )
            )
        }
    }

    public addTransport(transport: any): Logger {
        return this._logger.add(transport)
    }

    public error(message: string): void {
        this._logger.error(message)
    }

    public warn(message: string): void {
        this._logger.warn(message)
    }

    public info(message: string): void {
        this._logger.info(message)
    }

    public verbose(message: string): void {
        this._logger.verbose(message)
    }

    public debug(message: string): void {
        this._logger.debug(message)
    }

    public silly(message: string): void {
        this._logger.silly(message)
    }

    public changeLoggerConfiguration(enabled: boolean, level?: string): void {

        this._options.silent = !enabled

        if (level)
            this._options.level = level

        this._logger.clear()
        this._logger.add(new transports.Console(this._options))

        return
    }
}

/**
 * Logger interface.
 * logging levels are prioritized from 0 to 5 (highest to lowest):
 *   error: 0,
 *   warn: 1,
 *   info: 2,
 *   verbose: 3,
 *   debug: 4,
 *   silly: 5
 *
 * @see {@link https://github.com/winstonjs/winston#using-logging-levels} for further information.
 */
export interface ICustomLogger {
    logger: Logger

    error(message: string): void

    warn(message: string): void

    info(message: string): void

    verbose(message: string): void

    debug(message: string): void

    silly(message: string): void

    addTransport(transport: any): Logger

    changeLoggerConfiguration(enabled: boolean, level?: string): void
}
