export interface IConnConfiguration {
    host: string,
    port: number,
    username: string,
    password: string,
    vhost?: string,
}

export interface IConnOptions {
    retries?: number // number of retries, 0 is forever
    interval?: number // retry interval in ms
    ssl_options?: ISslOptions
}

export interface ISslOptions {
    cert?: string,
    key?: string,
    passphrase?: string
    ca?: string[]
}

export const defaultOptions: IConnOptions = {
    retries: 0,
    interval: 1000
}
