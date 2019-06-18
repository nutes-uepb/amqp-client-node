
import { IOptions } from '../port/configuration.inteface'

import { ConnectionRabbitMQ } from './connection.rabbitmq'
import { IEventbusInterface } from '../port/eventbus.interface'
import { IEventHandler } from '../port/event.handler.interface'

import { EventEmitter } from 'events'

export abstract class EventBus extends EventEmitter implements IEventbusInterface {

    protected pubconnection: ConnectionRabbitMQ = new ConnectionRabbitMQ()
    protected subconnection: ConnectionRabbitMQ = new ConnectionRabbitMQ()

    protected host: string
    protected port: number
    protected username: string
    protected password: string
    protected options?: IOptions

    protected pubActived: boolean = false
    protected subActived: boolean = false

    constructor(host: string, port: number, username: string, password: string, options?: IOptions){
        super()

        this.host = host
        this.port = port
        this.username = username
        this.password = password
        this.options = options

    }

    protected pubEventInitialization(): void{

        this.pubconnection.conn.on('error_connection', (err) => {this.emit('error_pub', err)})
        this.pubconnection.conn.on('close_connection', (err) => {this.emit('disconnected_pub', err)})
        this.pubconnection.conn.on('open_connection', (err) => {this.emit('connected_pub', err)})
        this.pubconnection.conn.on('lost_connection', (err) => {this.emit('lost_connection_pub', err)})
        this.pubconnection.conn.on('trying_connect', (err) => {this.emit('trying_connection_pub', err)})
        this.pubconnection.conn.on('re_established_connection', (err) => {this.emit('reconnected_pub', err)})

    }

    protected subEventInitialization(): void{

        this.subconnection.conn.on('error_connection', (err) => {this.emit('error_sub', err)})
        this.subconnection.conn.on('close_connection', (err) => {this.emit('disconnected_sub', err)})
        this.subconnection.conn.on('open_connection', (err) => {this.emit('connected_sub', err)})
        this.subconnection.conn.on('lost_connection', (err) => {this.emit('lost_connection_sub', err)})
        this.subconnection.conn.on('trying_connect', (err) => {this.emit('trying_connection_sub', err)})
        this.subconnection.conn.on('re_established_connection', (err) => {this.emit('reconnected_sub', err)})

    }

    get getPubConnection(){
        return this.pubconnection
    }

    get getSubConnection(){
        return this.subconnection
    }

    get isPubConnected(): boolean {
        return this.pubconnection.isConnected
    }

    get isSubConnected(): boolean {
        return this.subconnection.isConnected
    }

    public dispose(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.pubconnection.closeConnection()
                await this.subconnection.closeConnection()

                if (!this.isPubConnected && !this.isSubConnected){
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

    public receiveFromYourself(value: boolean): boolean {
        this.subconnection.receiveFromYourself = value
        return this.subconnection.receiveFromYourself
    }

    public logger(enabled: boolean, level?: string): boolean{
        try {
            this.pubconnection.logger(!enabled, level)
            this.subconnection.logger(!enabled, level)
            return true
        }catch (e) {
            return false
        }
    }

}
