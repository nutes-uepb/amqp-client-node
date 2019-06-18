import { EventBus } from '../rabbitmq/connection/eventbus'
import { IOptions } from '../rabbitmq/port/configuration.inteface'
import { Topic } from '../communication/topic'
import { Direct } from '../communication/direct'
import { Fanout } from '../communication/fanout'
import { WorkQueues } from '../communication/work.queues'

export class PubSub<E extends EventBus>{

    private rabbitBus: EventBus

    protected host: string
    protected port: number
    protected username: string
    protected password: string
    protected options?: IOptions

    constructor(host: string, port: number, username: string, password: string, options?: IOptions){
        this.host = host
        this.port = port
        this.username = username
        this.password = password
        this.options = options
    }

    // public createInstance<T extends EventBus>(c: new (host, port, username, password, options) => T): T {
    //     return new Topic(this.host, this.port, this.username, this.password, undefined)
    // }

    public createDirectInstance(): Direct {
        return new Direct(this.host, this.port, this.username, this.password, this.options )
    }

    public createTopicInstance(): Topic {
        return new Topic(this.host, this.port, this.username, this.password, this.options )
    }

    public createWorkerInstance(): WorkQueues {
        return new WorkQueues(this.host, this.port, this.username, this.password, this.options )
    }

    public createFanoutInstance(): Fanout {
        return new Fanout(this.host, this.port, this.username, this.password, this.options )
    }
}
