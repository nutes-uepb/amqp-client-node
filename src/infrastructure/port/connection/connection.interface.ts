import { IConfigurationParameters, IConnectionBase } from '../configuration.inteface'
import { Connection } from '../../rabbitmq/connection/connection'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'
// import { Connection, Exchange, Queue } from '../../rabbitmq/amqp-ts'

export interface IConnection extends IConnectionBase {
    idConnection: string

    isConnected: boolean

    configurations: IConfigurationParameters

    startingConnection: boolean

    conn?: any

    tryConnect(): Promise<Connection>

    getExchange(exchangeName: string, type: string): Exchange

    getQueue(queueName: string): Queue

}
