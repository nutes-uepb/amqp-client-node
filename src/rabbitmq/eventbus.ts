
import { IOptions } from '../port/configuration.inteface'

import { ConnectionRabbitMQ } from './connection.rabbitmq'
import { IEventbusInterface } from '../port/eventbus.interface'
import { IEventHandler } from '../port/event.handler.interface'

import { EventEmitter } from 'events'

export class EventBus extends EventEmitter implements IEventbusInterface {

    private pubconnection: ConnectionRabbitMQ = new ConnectionRabbitMQ()
    private subconnection: ConnectionRabbitMQ = new ConnectionRabbitMQ()

    private host: string
    private port: number
    private username: string
    private password: string
    private options?: IOptions

    private pubActived: boolean = false
    private subActived: boolean = false

    constructor(host: string, port: number, username: string, password: string, options?: IOptions){
        super()

        this.host = host
        this.port = port
        this.username = username
        this.password = password
        this.options = options

    }

    private pubEventInitialization(): void{

        this.pubconnection.conn.on('error_connection', (err) => {this.emit('error_pub', err)})

        this.pubconnection.conn.on('close_connection', (err) => {this.emit('disconnected_pub', err)})

        this.pubconnection.conn.on('open_connection', (err) => {this.emit('connected_pub', err)})

        this.pubconnection.conn.on('lost_connection', (err) => {this.emit('lost_connection_pub', err)})

        this.pubconnection.conn.on('trying_connect', (err) => {this.emit('trying_connection_pub', err)})

        this.pubconnection.conn.on('re_established_connection', (err) => {this.emit('reconnected_pub', err)})

    }

    private subEventInitialization(): void{

        this.subconnection.conn.on('error_connection', (err) => {this.emit('error_sub', err)})

        this.subconnection.conn.on('close_connection', (err) => {this.emit('disconnected_sub', err)})

        this.subconnection.conn.on('open_connection', (err) => {this.emit('connected_sub', err)})

        this.subconnection.conn.on('lost_connection', (err) => {this.emit('lost_connection_sub', err)})

        this.subconnection.conn.on('trying_connect', (err) => {this.emit('trying_connection_sub', err)})

        this.subconnection.conn.on('re_established_connection', (err) => {this.emit('reconnected_sub', err)})

    }

    get isConnected(): boolean {
        if (this.pubActived && this.subActived)
            return this.pubconnection.isConnected && this.subconnection.isConnected
        if (this.pubActived)
            return this.pubconnection.isConnected
        if (this.subActived)
            return this.subconnection.isConnected
        return false
    }

    public dispose(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.pubconnection.closeConnection()
                await this.subconnection.closeConnection()

                if (!this.isConnected){
                    this.pubActived = false
                    this.pubActived = false
                    return resolve(true)
                }
                else
                    return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public pub(exchangeName: string, topicKey: string, message: any ):  Promise<boolean>{
        this.pubActived = true
        return new Promise<boolean>(async (resolve, reject) => {
            await this.pubconnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
            this.pubEventInitialization()
            await this.pubconnection.conn.initialized

            if (this.isConnected){
                this.pubconnection.sendMessage(exchangeName, topicKey, message).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }

    public sub(exchangeName: string, queueName: string, routing_key: string,
               callback: (message: any) => void ): Promise<boolean>{
        this.subActived = true
        const eventCallback: IEventHandler<any> = {
            handle: callback
        }

        return new Promise<boolean>(async (resolve, reject) => {
            await this.subconnection.tryConnect(this.host, this.port, this.username, this.password, this.options)
            this.subEventInitialization()
            await this.subconnection.conn.initialized

            if (this.isConnected){
                this.subconnection.receiveMessage(exchangeName, queueName, routing_key, eventCallback).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            }else {
                return resolve(false)
            }
        })
    }

    public receiveFromYourself(value: boolean): boolean {
        this.subconnection.receiveFromYourself = value
        return this.subconnection.receiveFromYourself
    }

    public logger(enabled: boolean, level?: string): boolean{
        try {
            this.pubconnection.logger(enabled, level)
            this.subconnection.logger(enabled, level)
            return true
        }catch (e) {
            return false
        }
    }
}
