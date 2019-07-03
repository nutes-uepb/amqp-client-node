export interface IConfiguration{
    vhost: string,
    host: string,
    port: number,
    username: string,
    password: string,
    options: IOptions
}

export interface IOptions {
    retries: number // number of retries, 0 is forever
    interval: number // retry interval in ms
    ssl: {
        enabled: boolean,
        ca: string
    }
    rcpTimeout: number
}

export const defaultOptions: IOptions = {
    retries: 0,
    interval: 1000,
    ssl: {
        enabled: false,
        ca: ''
    },
    rcpTimeout: 5000
}
