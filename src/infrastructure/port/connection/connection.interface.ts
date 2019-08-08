import { IConnectionParams, IConnectionOptions } from '../../../application/port/connection.config.inteface'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'
import { IExchangeOptions } from '../../../application/port/exchange.option.interface'
import { IQueueOptions } from '../../../application/port/queue.option.interface'

export interface IBusConnection {

    connectionId: string

    isConnected: boolean

    configurations: IConnectionParams | string

    options: IConnectionOptions

    conn?: any

    connect(): Promise<void>

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

    getExchange(exchangeName: string, option?: IExchangeOptions): Exchange

    getQueue(queueName: string,  option?: IQueueOptions): Queue

    on(event: string | symbol, listener: (...args: any[]) => void): void

}
