import { IConfiguration, IOptions } from '../configuration.inteface'
import { ConnectionFactoryRabbitMQ } from '../../rabbitmq/connection/connection.factory.rabbitmq'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

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

    getExchange(exchangeName: string, config: ICommunicationConfig): Exchange

    getQueue(queueName: string, config: ICommunicationConfig): Queue

}
