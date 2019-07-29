/// <reference types="node" />
export interface IConnectionParams {
    protocol?: string;
    hostname?: string;
    port?: number;
    username?: string;
    password?: string;
    locale?: string;
    frameMax?: number;
    heartbeat?: number;
    vhost?: string;
}
export interface ISSLOptions {
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
    ca?: Buffer[];
}
export interface IConnectionOptions {
    retries?: number;
    interval?: number;
    ssl_options?: ISSLOptions;
}
