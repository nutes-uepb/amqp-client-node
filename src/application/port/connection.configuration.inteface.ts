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
    ssl_options?: {
        enabled: boolean,
        ca: string
    }
    rcp_timeout?: number
}

export const defaultOptions: IConnOptions = {
    retries: 0,
    interval: 1000,
    ssl_options: {
        enabled: false,
        ca: ''
    },
    rcp_timeout: 5000
}
