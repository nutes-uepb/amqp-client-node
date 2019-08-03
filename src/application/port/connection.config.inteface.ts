export interface IConnectionParams {
    protocol?: string,  // value default: 'amqp'
    hostname?: string,  // value default: 'localhost'
    port?: number,      // value default: 5672
    username?: string,  // value default: 'guest'
    password?: string,  // value default: 'guest'
    locale?: string,    // value default: 'en_US'
    frameMax?: number,  // value default: 0
    heartbeat?: number, // value default: 0
    vhost?: string      // value default: '/'
}

export interface ISSLOptions {
    cert?: Buffer,
    key?: Buffer,
    passphrase?: string
    ca?: Buffer[]
}

export interface IConnectionOptions {
    retries?: number // number of retries, 0 is forever
    interval?: number // retry interval in ms
    sslOptions?: ISSLOptions
}
