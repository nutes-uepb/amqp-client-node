import { ConnectionRabbitMQ } from '../connection.rabbitmq'
import { Message } from '../../infrastructure/amqp-ts'
import { IMessage } from '../../port/message.interface'

export class MessageSenderRabbitmq extends ConnectionRabbitMQ{

    public sendMessageWorkQueues(eventName: string,
                                 queueName: string,
                                 message:  any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let msg = await this.createMessage(eventName, message)

                    let queue = await this._connection.declareQueue(queueName, { durable: true })
                    queue.send(msg)
                    this._logger.info('Bus event message sent with success!')

                    return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public sendMessageFanout(eventName: string,
                             exchangeName: string,
                             message:  any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let msg = await this.createMessage(eventName, message)

                    const exchange = this._connection.declareExchange(exchangeName, 'fanout', { durable: true })

                    if (await exchange.initialized) {
                        exchange.send(msg)
                        this._logger.info('Bus event message sent with success!')
                        await exchange.close()
                    }

                    return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public sendMessageTopicOrDirec(type: string,
                                   exchangeName: string,
                                   topicKey: string,
                                   message:  any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (this.isConnected) {
                    let msg = await this.createMessage(message)

                    const exchange = this._connection.declareExchange(exchangeName, type, { durable: true })

                    if (await exchange.initialized) {
                        exchange.send(msg, topicKey)
                        this._logger.info('Bus event message sent with success!')
                        await exchange.close()
                    }

                    return resolve(true)
                }
                return resolve(false)
            } catch (err) {
                return reject(err)
            }
        })
    }

    private createMessage(message:  any,
                          eventName?: string): Promise<Message> {
        return new Promise<Message>(async (resolve, reject) => {
            try {
                const msg: IMessage = {
                    timestamp: new Date().toISOString(),
                    body: message
                }

                if (eventName)
                    msg.eventName = eventName

                if (!ConnectionRabbitMQ.idConnection)
                    ConnectionRabbitMQ.idConnection = 'id-' + Math.random().toString(36).substr(2, 16)

                const rabbitMessage: Message = new Message(msg)
                rabbitMessage.properties.appId = ConnectionRabbitMQ.idConnection

                return resolve(rabbitMessage)

            } catch (err) {
                return reject(err)
            }
        })
    }

}
