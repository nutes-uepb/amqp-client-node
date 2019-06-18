import { Connection } from 'amqp-ts'
import * as amqp from 'amqp-ts'
import { IConnectionFactory } from '../port/connection.factory.interface'

import { IConfiguration, IOptions } from '../port/configuration.inteface'
import * as fs from 'fs'

const defaultValues: IConfiguration = {
    vhost: 'ocariot',
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    options: {
        retries: 0,
        interval: 1000,
        ssl: {
            enabled: false,
            ca: ''
        }
    } as IOptions
}

export class ConnectionFactoryRabbitMQ implements IConnectionFactory {

    private configuration: IConfiguration

    constructor(host: string, port: number, username: string, password: string, options?: IOptions){
        this.configuration = defaultValues
        this.configuration.host = host
        this.configuration.port = port
        this.configuration.username = username
        this.configuration.password = password
        if (options)
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
            const conn = new Connection('protocol://username:password@host:port/vhost'
                    .replace('protocol', this.configuration.options.ssl.enabled ? 'amqps' : 'amqp')
                    .replace('host', process.env.RABBITMQ_HOST || this.configuration.host)
                    .replace('port', (process.env.RABBITMQ_PORT || this.configuration.port).toString())
                    .replace('vhost', process.env.RABBITMQ_PORT || this.configuration.vhost)
                    .replace('username', process.env.RABBITMQ_USERNAME || this.configuration.username)
                    .replace('password', process.env.RABBITMQ_PASSWORD || this.configuration.password)
                ,
                {ca: fs.readFileSync(this.configuration.options.ssl.ca)},
                { retries: this.configuration.options.retries, interval: this.configuration.options.interval })

            return Promise.resolve(conn)
        } catch (err) {
            return Promise.reject(err)
        }
    }
}
