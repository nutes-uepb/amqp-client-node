import { EventBus } from '../rabbitmq/connection/eventbus'
import { IOptions } from '../rabbitmq/port/configuration.inteface'
import { Topic, topic } from '../communication/mode/topic'
import { Direct, direct } from '../communication/mode/direct'
import { Fanout, fanout } from '../communication/mode/fanout'
import { WorkQueues, workQueues } from '../communication/mode/work.queues'

export class PubSub<E extends EventBus> {

    protected host: string
    protected port: number
    protected username: string
    protected password: string
    protected options?: IOptions

    constructor(host: string, port: number, username: string, password: string, options?: IOptions) {
        this.host = host
        this.port = port
        this.username = username
        this.password = password
        this.options = options
    }

    public createDirectInstance(): Direct {
        direct.setConfigurations(this.host, this.port, this.username, this.password, this.options)
        return direct
    }

    public createTopicInstance(): Topic {
        topic.setConfigurations(this.host, this.port, this.username, this.password, this.options)
        return topic
    }

    public createWorkerInstance(): WorkQueues {
        workQueues.setConfigurations(this.host, this.port, this.username, this.password, this.options)
        return workQueues
    }

    public createFanoutInstance(): Fanout {
        fanout.setConfigurations(this.host, this.port, this.username, this.password, this.options)
        return fanout
    }
}
