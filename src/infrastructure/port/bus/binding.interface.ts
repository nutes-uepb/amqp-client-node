import { Exchange } from '../../rabbitmq/bus/exchange'
import { Queue } from '../../rabbitmq/bus/queue'

export interface IBinding {

    initialized: Promise<IBinding>
    source: Exchange
    destination: Exchange | Queue

    initialize(): void

    delete(): Promise<void>

}
