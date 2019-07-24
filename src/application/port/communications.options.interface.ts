import { IExchangeOptions } from './exchange.options.interface'
import { IQueueOptions } from './queue.options.interface'
import { ETypeCommunication } from './type.communication.enum'

export interface ICommunicationOptions {
    exchange?: IExchangeOptions,
    queue?: IQueueOptions
    receive_from_yourself?: boolean
}

export interface ICommunicationConfig extends ICommunicationOptions {
    type: ETypeCommunication
}
