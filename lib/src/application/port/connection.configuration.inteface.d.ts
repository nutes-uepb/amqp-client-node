export interface IConnConfiguration {
    host: string;
    port: number;
    username: string;
    password: string;
    vhost?: string;
}
export interface IConnOptions {
    retries?: number;
    interval?: number;
    ssl_options?: ISslOptions;
}
export interface ISslOptions {
    cert?: string;
    key?: string;
    passphrase?: string;
    ca?: string[];
}
export declare const defaultOptions: IConnOptions;
