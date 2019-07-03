import { EventBus } from '../rabbitmq/connection/eventbus'
import { IOptions } from '../rabbitmq/port/configuration.inteface'
import { Topic, topic } from '../communication/mode/topic'
import { Direct, direct } from '../communication/mode/direct'
import { Fanout, fanout } from '../communication/mode/fanout'
import { WorkQueues, workQueues } from '../communication/mode/work.queues'

export class PubSub<E extends EventBus> {

    constructor(vhost: string, host: string, port: number, username: string, password: string, options?: IOptions) {

        topic.setConfigurations(vhost, host, port, username, password, options)
        direct.setConfigurations(vhost, host, port, username, password, options)
        fanout.setConfigurations(vhost, host, port, username, password, options)
        workQueues.setConfigurations(vhost, host, port, username, password, options)

    }

    public createTopicInstance(): Topic {
        return topic
    }

    public createDirectInstance(): Direct {
        return direct
    }

    public createFanoutInstance(): Fanout {
        return fanout
    }

    public createWorkerInstance(): WorkQueues {
        return workQueues
    }
}
