import { IConfiguration, IOptions } from '../configuration.inteface'
import { ConnectionFactoryRabbitMQ } from '../../rabbitmq/connection/connection.factory.rabbitmq'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'

export interface IConnection {

    idConnection: string

    isConnected: boolean

    configurations: IConfiguration | string

    options: IOptions

    startingConnection: boolean

    conn?: any

    tryConnect(): Promise<ConnectionFactoryRabbitMQ>

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

    getExchange(exchangeName: string, type: string): Exchange

    getQueue(queueName: string): Queue

}
