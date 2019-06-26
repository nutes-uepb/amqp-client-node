import { ConnectionRabbitMQ } from '../connection.rabbitmq'
import { IClientRequest } from '../../port/resource.handler.interface'

export class ClientRegisterRabbitmq extends ConnectionRabbitMQ {

    public registerClientWorkQueues(callback: (message: any) => void,
                                    queueName: string,
                                    resource: IClientRequest): Promise<boolean> {

        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const queue = this._connection.declareQueue(queueName, { durable: true });

                queue.rpc(resource).then(msg => {
                    callback(msg.getContent())
                })

                this._logger.info('Client registered in ' + queueName + ' queue!')
                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public registerClientFanout(callback: (message: any) => void,
                                exchangeName: string,
                                resource: IClientRequest): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const exchange = this._connection.declareExchange(exchangeName, 'fanout', { durable: true });

                exchange.rpc(resource, '', msg => {
                    callback(msg.getContent())
                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!')
                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }

    public registerClientDirectOrTopic(type: string,
                                       callback: (message: any) => void,
                                       exchangeName: string,
                                       resource: IClientRequest): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const exchange = this._connection.declareExchange(exchangeName, type, { durable: true });

                exchange.rpc(resource, '', msg => {
                    callback(msg.getContent())
                }).catch(e => {
                    console.log(e)
                    this._logger.error('WWithout server response!')
                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!')
                return resolve(true)
            } catch (err) {
                return reject(err)
            }
        })
    }
}
