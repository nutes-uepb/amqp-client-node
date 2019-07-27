import { IConnConfiguration, IConnOptions } from '../../../application/port/connection.configuration.inteface'
import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'
import { ETypeCommunication } from '../../../application/port/type.communication.enum'
import { IExchangeOptions } from '../../../application/port/exchange.options.interface'
import { IQueueOptions } from '../../../application/port/queue.options.interface'

export interface IBusConnection {

    idConnection: string

    isConnected: boolean

    configurations: IConnConfiguration | string

    options: IConnOptions

    conn?: any

    connect(): Promise<void>

    closeConnection(): Promise<boolean>

    disposeConnection(): Promise<boolean>

    getExchange(exchangeName: string, option?: IExchangeOptions): Exchange

    getQueue(queueName: string,  option?: IQueueOptions): Queue

    on(event: string | symbol, listener: (...args: any[]) => void): void

}
