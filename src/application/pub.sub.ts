import { IOptions } from '../infrastructure/port/configuration.inteface'
import { Topic } from './communication/topic'
import { Identifier } from '../di/identifier'
import { DependencyInject } from '../di/di'
import { Container } from 'inversify'

// import { Direct, direct } from './communication/direct'

/**
 * TESTADO e APROVADO!!!
 *
 *
 * ATENÇÃO!!!
 *  - remover do packege,json @types/bluebird, amqplib e when
 *    - @types sempre fica em dev dependencias, pois é uma dependencia de desenvolvimento.
 *  - Organizar as dependencias no package. O que for necessário apenas para o desenvolvimento como libraries de teset
 *  e @types fica em devDependencies.
 *  Acho que faltou conhecimento base de node
 *  https://pt.stackoverflow.com/questions/163785/qual-a-diferen%C3%A7a-entre-dependencies-e-devdependencies
 *
 *  LET'S GO BOY!!!
 */

export class PubSub  {
    private _topic: Topic
    private readonly _logger

    constructor(
        private readonly vhost: string,
        private readonly host: string,
        private readonly port: number,
        private readonly username: string,
        private readonly password: string,
        private readonly options?: IOptions) {
        const container = new DependencyInject().getContainer()

        this._logger = container.get(Identifier.CUSTOM_LOGGER)
        this._topic = container.get(Identifier.TOPIC)
        this._topic.setConfigurations(this.vhost, this.host, this.port, this.username, this.password, this.options)

    }

    get topic(): Topic {
        return this._topic
    }

// public direct(): Direct {
//     return this._direct
//     }

    public logger(enabled: boolean, level?: string): void {
        this._logger.changeLoggerConfiguration(enabled, level)
        return
    }

}
