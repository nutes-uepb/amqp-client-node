import { IQueueDeclarationOptions } from './bus/queue.options.interface'
import { IExchangeDeclarationOptions } from './bus/exchange.options.interface'

export interface IConfiguration {
    host: string,
    port: number,
    username: string,
    password: string,
    vhost: string,
}

export interface IOptions {
    retries: number // number of retries, 0 is forever
    interval: number // retry interval in ms
    ssl: {
        enabled: boolean,
        ca: string
    }
    rcp_timeout: number
    queue?: IQueueDeclarationOptions
    exchange?: IExchangeDeclarationOptions
}

export const defaultOptions: IOptions = {
    retries: 0,
    interval: 1000,
    ssl: {
        enabled: false,
        ca: ''
    },
    rcp_timeout: 5000,
    queue: {},
    exchange: {}
}
