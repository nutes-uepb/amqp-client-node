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
    sslOptions?: {
        enabled: boolean,
        ca: string
    }
    rcpTimeout?: number
}

export const defaultOptions: IConnOptions = {
    retries: 0,
    interval: 1000,
    sslOptions: {
        enabled: false,
        ca: ''
    },
    rcpTimeout: 5000
}
