import { IConnConfiguration, IConnOptions } from '../../../application/port/connection.configuration.inteface'
import { ConnectionFactoryRabbitMQ } from '../../rabbitmq/connection/connection.factory.rabbitmq'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'

export interface IConnection {

    idConnection: string

    isConnected: boolean

    configurations: IConnConfiguration | string

    options: IConnOptions

    startingConnection: boolean

    conn?: any

    tryConnect(): Promise<void>

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

    getExchange(exchangeName: string, config: ICommunicationConfig): Exchange

    getQueue(queueName: string, config: ICommunicationConfig): Queue

}
