import { Connection } from '../infrastructure/amqp-ts'
import { IConnectionFactory } from '../port/connection.factory.interface'

import { IConfiguration, IOptions, defaultOptions } from '../port/configuration.inteface'
import * as fs from 'fs'

export class ConnectionFactoryRabbitMQ implements IConnectionFactory {

    private configuration: IConfiguration

    constructor(vhost: string, host: string, port: number, username: string, password: string, options?: IOptions) {
        this.configuration = {
            vhost: vhost,
            host: host,
            port: port,
            username: username,
            password: password,
            options: defaultOptions
        } as IConfiguration

        if(options)
            this.configuration.options = options
        // amqp.log.transports.console.level = 'info'
    }

    /**
     * Create instance of {@link Connection} Class belonging
     * to the amqp-ts library to connect to RabbitMQ.
     *
     * @param _retries Total attempts to be made until give up reconnecting
     * @param _interval Interval in milliseconds between each attempt
     * @return Promise<Connection>
     */
    public async createConnection(): Promise<Connection> {
        try {
            let certAuth = {}

            if (this.configuration.options.ssl.enabled){
                if(!this.configuration.options.ssl.ca)
                    return Promise.reject(new Error('Paramater ca not passed'))
                certAuth = {ca: fs.readFileSync(this.configuration.options.ssl.ca)}
            }

            const conn = new Connection('protocol://username:password@host:port/vhost'
                    .replace('protocol', this.configuration.options.ssl.enabled ? 'amqps' : 'amqp')
                    .replace('host', process.env.RABBITMQ_HOST || this.configuration.host)
                    .replace('port', (process.env.RABBITMQ_PORT || this.configuration.port).toString())
                    .replace('vhost', process.env.RABBITMQ_PORT || this.configuration.vhost)
                    .replace('username', process.env.RABBITMQ_USERNAME || this.configuration.username)
                    .replace('password', process.env.RABBITMQ_PASSWORD || this.configuration.password)
                ,
                certAuth ,
                { retries: this.configuration.options.retries, interval: this.configuration.options.interval })

            return Promise.resolve(conn)
        } catch (err) {
            return Promise.reject(err)
        }
    }
}
