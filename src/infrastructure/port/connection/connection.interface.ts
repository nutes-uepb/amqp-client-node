import { IConfiguration, IConnectionBase, IOptions } from '../configuration.inteface'
import { ConnectionFactoryRabbitMQ } from '../../rabbitmq/connection/connection.factory.rabbitmq'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'

export interface IConnection extends IConnectionBase {

    idConnection: string

    isConnected: boolean

    configurations: IConfiguration | string

    options: IOptions

    startingConnection: boolean

    conn?: any

    tryConnect(): Promise<ConnectionFactoryRabbitMQ>

    getExchange(exchangeName: string, type: string): Exchange

    getQueue(queueName: string): Queue

}
