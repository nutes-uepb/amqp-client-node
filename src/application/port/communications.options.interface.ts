import { IExchangeDeclarationOptions } from '../../infrastructure/port/bus/exchange.options.interface'
import { IQueueDeclarationOptions } from '../../infrastructure/port/bus/queue.options.interface'
import { ETypeCommunication } from './type.communication.enum'

export interface ICommunicationOptions {
    exchange?: IExchangeDeclarationOptions,
    queue?: IQueueDeclarationOptions
    receiveFromYourself?: boolean
}

export interface ICommunicationConfig extends ICommunicationOptions {
    type: ETypeCommunication
}
