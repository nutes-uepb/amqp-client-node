import { Connection } from './connection'
import { IConnectionFactory } from '../../port/connection/connection.factory.interface'

import { defaultOptions, IConfigurationParameters } from '../../port/configuration.inteface'
import * as fs from 'fs'
import { injectable } from 'inversify'

@injectable()
export class ConnectionFactoryRabbitMQ implements IConnectionFactory {

    private _configuration: IConfigurationParameters

    constructor() {
        // not implemented
    }

    /**
     * Create instance of {@link Connection} Class belonging
     * to the amqp-ts library to connect to RabbitMQ.
     *
     * @return Promise<Connection>
     * @param config
     */
    public async createConnection(config: IConfigurationParameters): Promise<Connection> {
        this._configuration = config

        if (!this._configuration.options)
            this._configuration.options = defaultOptions
        // amqp.log.transports.console.level = 'info'

        try {
            let certAuth = {}

            if (this._configuration.options.ssl.enabled) {
                if (!this._configuration.options.ssl.ca)
                    return Promise.reject(new Error('Paramater ca not passed'))
                certAuth = { ca: fs.readFileSync(this._configuration.options.ssl.ca) }
            }

            const conn = new Connection('protocol://username:password@host:port/vhost'
                    .replace('protocol', this._configuration.options.ssl.enabled ? 'amqps' : 'amqp')
                    .replace('host', this._configuration.host)
                    .replace('port', (this._configuration.port).toString())
                    .replace('vhost', this._configuration.vhost)
                    .replace('username', this._configuration.username)
                    .replace('password', this._configuration.password)
                ,
                certAuth,
                { retries: this._configuration.options.retries, interval: this._configuration.options.interval })


            return Promise.resolve(conn)
        } catch (err) {
            return Promise.reject(err)
        }
    }
}
