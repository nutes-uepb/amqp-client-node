import { IClientRequest } from '../../port/rpc/resource.handler.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IConnection } from '../../port/connection/connection.interface'
import { IClientRegister } from '../../port/rpc/client.register.interface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'
import { IMessage } from '../../../application/port/message.interface'

@injectable()
export class ClientRegisterRabbitmq implements IClientRegister {

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {

    }

    public registerRoutingKeyClient(exchangeName: string,
                                    resource: IClientRequest,
                                    config: ICommunicationConfig): Promise<IMessage> {
        return new Promise<IMessage>(async (resolve, reject) => {
            try {

                if (!this._connection.isConnected) {
                    return reject(new Error('Connection Failed'))
                }

                const exchange = this._connection.getExchange(exchangeName, config)

                let time
                const timeout = this._connection.options.rcpTimeout

                if (timeout > 0) {
                    new Promise<any>((res) => {
                        time = setTimeout(res, timeout)
                    }).then(() => {
                        reject(new Error('rpc timed out'))
                    })
                }

                exchange.rpc(resource, resource.resourceName, (err, msg) => {
                    clearTimeout(time)

                    if (err) return reject(err)

                    const mensage = {
                        content: msg.getContent(),
                        fields: msg.fields,
                        properties: msg.properties
                    } as IMessage

                    return resolve(mensage)
                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!')

            } catch (err) {
                return reject(err)
            }
        })
    }

}
