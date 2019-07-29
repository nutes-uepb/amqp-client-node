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
    cert?: string;
    key?: string;
    passphrase?: string;
    ca?: string[];
}
export interface IConnectionOptions {
    retries?: number;
    interval?: number;
    ssl_options?: ISSLOptions;
}
