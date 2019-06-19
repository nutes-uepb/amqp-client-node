import { IOptions } from '../port/configuration.inteface'
import { IEventbusInterface } from '../port/eventbus.interface'
import { IResourceHandler } from '../port/resource.handler.interface'

import { EventEmitter } from 'events'
import { MessageSenderRabbitmq } from './pubsub/message.sender.rabbitmq'
import { MessageReceiverRabbitmq } from './pubsub/message.receiver.rabbitmq'
import { ServerRegisterRabbitmq } from './client-server/server.register.rabbitmq'
import { ClientRegisterRabbitmq } from './client-server/client.register.rabbitmq'

export abstract class EventBus extends EventEmitter implements IEventbusInterface {

    protected pubconnection: MessageSenderRabbitmq = new MessageSenderRabbitmq()
    protected subconnection: MessageReceiverRabbitmq = new MessageReceiverRabbitmq()
    protected clientConnection: ClientRegisterRabbitmq = new ClientRegisterRabbitmq()
    protected serverConnection: ServerRegisterRabbitmq = new ServerRegisterRabbitmq()

    protected host: string
    protected port: number
    protected username: string
    protected password: string
    protected options?: IOptions

    protected pubActived: boolean = false
    protected subActived: boolean = false
    protected clientActived: boolean = false
    protected serverActived: boolean = false

    constructor(host: string,
                port: number,
                username: string,
                password: string,
                options?: IOptions) {
        super()

        this.host = host
        this.port = port
        this.username = username
        this.password = password
        this.options = options

    }

    protected pubEventInitialization(): void {

        this.pubconnection.conn.on('error_connection', (err) => {
            this.emit('error_pub', err)
        })
        this.pubconnection.conn.on('close_connection', (err) => {
            this.emit('disconnected_pub', err)
        })
        this.pubconnection.conn.on('open_connection', (err) => {
            this.emit('connected_pub', err)
        })
        this.pubconnection.conn.on('lost_connection', (err) => {
            this.emit('lost_connection_pub', err)
        })
        this.pubconnection.conn.on('trying_connect', (err) => {
            this.emit('trying_connection_pub', err)
        })
        this.pubconnection.conn.on('re_established_connection', (err) => {
            this.emit('reconnected_pub', err)
        })

    }

    protected subEventInitialization(): void {

        this.subconnection.conn.on('error_connection', (err) => {
            this.emit('error_sub', err)
        })
        this.subconnection.conn.on('close_connection', (err) => {
            this.emit('disconnected_sub', err)
        })
        this.subconnection.conn.on('open_connection', (err) => {
            this.emit('connected_sub', err)
        })
        this.subconnection.conn.on('lost_connection', (err) => {
            this.emit('lost_connection_sub', err)
        })
        this.subconnection.conn.on('trying_connect', (err) => {
            this.emit('trying_connection_sub', err)
        })
        this.subconnection.conn.on('re_established_connection', (err) => {
            this.emit('reconnected_sub', err)
        })

    }

    protected clientEventInitialization(): void {

        this.clientConnection.conn.on('error_connection', (err) => {
            this.emit('error_client', err)
        })
        this.clientConnection.conn.on('close_connection', (err) => {
            this.emit('disconnected_client', err)
        })
        this.clientConnection.conn.on('open_connection', (err) => {
            this.emit('connected_client', err)
        })
        this.clientConnection.conn.on('lost_connection', (err) => {
            this.emit('lost_connection_client', err)
        })
        this.clientConnection.conn.on('trying_connect', (err) => {
            this.emit('trying_connection_client', err)
        })
        this.clientConnection.conn.on('re_established_connection', (err) => {
            this.emit('reconnected_client', err)
        })

    }

    protected serverEventInitialization(): void {

        this.serverConnection.conn.on('error_connection', (err) => {
            this.emit('error_server', err)
        })
        this.serverConnection.conn.on('close_connection', (err) => {
            this.emit('disconnected_server', err)
        })
        this.serverConnection.conn.on('open_connection', (err) => {
            this.emit('connected_server', err)
        })
        this.serverConnection.conn.on('lost_connection', (err) => {
            this.emit('lost_connection_server', err)
        })
        this.serverConnection.conn.on('trying_connect', (err) => {
            this.emit('trying_connection_server', err)
        })
        this.serverConnection.conn.on('re_established_connection', (err) => {
            this.emit('reconnected_server', err)
        })
    }

    get getPubConnection() {
        return this.pubconnection
    }

    get getSubConnection() {
        return this.subconnection
    }

    get getServerConnection() {
        return this.serverConnection
    }

    get getClientConnection() {
        return this.serverConnection
    }

    get isPubConnected(): boolean {
        return this.pubconnection.isConnected
    }

    get isSubConnected(): boolean {
        return this.subconnection.isConnected
    }

    get isClientConnected(): boolean {
        return this.clientConnection.isConnected
    }

    get isServerConnected(): boolean {
        return this.serverConnection.isConnected
    }

    public dispose(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.pubconnection.closeConnection()
                await this.subconnection.closeConnection()
                await this.clientConnection.closeConnection()
                await this.serverConnection.closeConnection()

                if (!this.isPubConnected && !this.isSubConnected &&
                    !this.isClientConnected && !this.isServerConnected) {
                    this.pubActived = false
                    this.pubActived = false
                    this.clientActived = false
                    this.serverActived = false
                    return resolve(true)
                } else
                    return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public receiveFromYourself(value: boolean): boolean {
        this.subconnection.receiveFromYourself = value
        return this.subconnection.receiveFromYourself
    }

    public logger(enabled: boolean, level?: string): boolean {
        try {
            this.pubconnection.logger(!enabled, level)
            this.subconnection.logger(!enabled, level)
            this.clientConnection.logger(!enabled, level)
            this.serverConnection.logger(!enabled, level)
            return true
        } catch (e) {
            return false
        }
    }

    public registerResource(queueName: string,
                            resourceName: string,
                            resource: (...any: any) => any): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {

            let resourceHandler: IResourceHandler = {
                resourceName,
                handle: resource
            }

            try {
                this.serverConnection.registerResource(queueName,
                    resourceHandler).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            } catch (e) {
                return resolve(false)
            }
        })
    }

    public abstract pub(...any: any): Promise<boolean>

    public abstract sub(...any: any): Promise<boolean>

    public abstract rpcServer(...any: any)

    public abstract rpcClient(...any: any)
}
