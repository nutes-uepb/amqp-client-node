import { IConfigurationParameters, IConnectionBase } from '../configuration.inteface'
import { ConnectionFactoryRabbitMQ } from '../../rabbitmq/connection/connectionFactoryRabbitMQ'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'

export interface IConnection extends IConnectionBase {
    setConfigurations: IConfigurationParameters

    idConnection: string

    isConnected: boolean

    configurations: IConfigurationParameters

    startingConnection: boolean

    conn?: any

    tryConnect(): Promise<ConnectionFactoryRabbitMQ>

    getExchange(exchangeName: string, type: string): Exchange

    getQueue(queueName: string): Queue

}
