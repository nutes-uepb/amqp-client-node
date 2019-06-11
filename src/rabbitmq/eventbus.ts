
import { IOptions } from '../port/configuration.inteface'

import { ConnectionRabbitMQ } from './connection.rabbitmq'
import { IEventbusInterface } from '../port/eventbus.interface'
import { IEventHandler } from '../port/event.handler.interface'

import { EventEmitter } from 'events'

export class EventBus extends EventEmitter implements IEventbusInterface {

    private pubconnection: ConnectionRabbitMQ = new ConnectionRabbitMQ()
    private subconnection: ConnectionRabbitMQ = new ConnectionRabbitMQ()

    private isErrorEvent = false
    private isDisconnectedEvent = false
    private isConnectedEvent = false
    private isReconnectedEvent = false
    private isLostConnectionEvent = false
    private isTryingConnectEvent = false

    private pubEventInitialization(): void{

        this.pubconnection.conn.on('error_connection', (err) => {
            if (!this.isErrorEvent){
                this.emit('error', err)
                this.isErrorEvent = true
            }else
                this.isErrorEvent = false
        })

        this.pubconnection.conn.on('close_connection', (err) => {
            if (!this.isDisconnectedEvent){
                this.emit('disconnected', err)
                this.isDisconnectedEvent = true
            }else
                this.isDisconnectedEvent = false
        })

        this.pubconnection.conn.on('open_connection', (err) => {
            if (this.isConnectedEvent){
                this.emit('connected', err)
                this.isConnectedEvent = false
            }else
                this.isConnectedEvent = true
        })

        this.pubconnection.conn.on('lost_connection', (err) => {
            if (!this.isLostConnectionEvent){
                this.emit('lost_connection', err)
                this.isLostConnectionEvent = true
            }else
                this.isLostConnectionEvent = false
        })

        this.pubconnection.conn.on('trying_connect', (err) => {
            if (!this.isTryingConnectEvent){
                this.emit('trying_connection', err)
                this.isTryingConnectEvent = true
            }else
                this.isTryingConnectEvent = false
        })

        this.pubconnection.conn.on('re_established_connection', (err) => {
            if (this.isReconnectedEvent){
                this.emit('reconnected', err)
                this.isReconnectedEvent = false
            }else
                this.isReconnectedEvent = true
        })

    }

    private subEventInitialization(): void{

        this.subconnection.conn.on('error_connection', (err) => {
            if (!this.isErrorEvent){
                this.emit('error', err)
                this.isErrorEvent = true
            }else
                this.isErrorEvent = false
        })

        this.subconnection.conn.on('close_connection', (err) => {
            if (!this.isDisconnectedEvent){
                this.emit('disconnected', err)
                this.isDisconnectedEvent = true
            }else
                this.isDisconnectedEvent = false
        })

        this.subconnection.conn.on('open_connection', (err) => {
            if (this.isConnectedEvent){
                this.emit('connected', err)
                this.isConnectedEvent = false
            }else
                this.isConnectedEvent = true
        })

        this.subconnection.conn.on('lost_connection', (err) => {
            if (!this.isLostConnectionEvent){
                this.emit('lost_connection', err)
                this.isLostConnectionEvent = true
            }else
                this.isLostConnectionEvent = false
        })

        this.subconnection.conn.on('trying_connect', (err) => {
            if (!this.isTryingConnectEvent){
                this.emit('trying_connection', err)
                this.isTryingConnectEvent = true
            }else
                this.isTryingConnectEvent = false
        })

        this.subconnection.conn.on('re_established_connection', (err) => {
            if (this.isReconnectedEvent){
                this.emit('reconnected', err)
                this.isReconnectedEvent = false
            }else
                this.isReconnectedEvent = true
        })

    }

    get isConnected(): boolean {
        if (this.pubconnection.isConnected && this.pubconnection.isConnected)
            return true
        return false
    }

    public connect(host: string, port: number, username: string, password: string,
                   options?: IOptions): Promise<boolean>{

        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.pubconnection.tryConnect(host, port, username, password, options)
                await this.subconnection.tryConnect(host, port, username, password, options)

                this.pubEventInitialization()
                this.subEventInitialization()

                await this.pubconnection.conn.initialized
                await this.subconnection.conn.initialized

                if (this.isConnected)
                    return resolve(true)
                else
                    return resolve(false)
            }catch (err) {
                return reject(err)
            }
        })
    }

    public close(): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                await this.pubconnection.closeConnection()
                await this.subconnection.closeConnection()

                if (!this.isConnected)
                    return resolve(true)
                else
                    return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public pub(exchangeName: string, topicKey: string, message: any ):  Promise<boolean>{

        return new Promise<boolean>(async (resolve, reject) => {
            this.pubconnection.sendMessage(exchangeName, topicKey, message).then(result => {
                return resolve(result)
            }).catch(err => {
                return reject(err)
            })
        })
    }

    public sub(exchangeName: string, queueName: string, routing_key: string,
               callback: (message: any) => void ): Promise<boolean>{

        const eventCallback: IEventHandler<any> = {
            handle: callback
        }

        return new Promise<boolean>(async (resolve, reject) => {
            this.subconnection.receiveMessage(exchangeName, queueName, routing_key, eventCallback).then(result => {
                return resolve(result)
            }).catch(err => {
                return reject(err)
            })
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
