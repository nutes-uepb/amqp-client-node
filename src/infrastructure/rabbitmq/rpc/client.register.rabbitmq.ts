import { IClientRequest } from '../../port/rpc/resource.handler.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IConnection } from '../../port/connection/connection.interface'
import { IClientRegister } from '../../port/rpc/client.register.interface'
import { IConfigurationParameters } from '../../port/configuration.inteface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'

@injectable()
export class ClientRegisterRabbitmq implements IClientRegister {

    constructor(@inject(Identifier.RABBITMQ_CONNECTION) private readonly _connection: IConnection,
                @inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger,
                @inject(Identifier.CUSTOM_EVENT_EMITTER) private readonly _emitter: ICustomEventEmitter) {

    }

    public registerClientDirectOrTopic(type: string,
                                       exchangeName: string,
                                       resource: IClientRequest,
                                       callback?: (err, message: any) => void): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            try {

                if (!this._connection.startingConnection) {
                    await this._connection.tryConnect()
                }

                if (!this._connection.isConnected)
                    return resolve(false)

                const exchange = this._connection.getExchange(exchangeName, type)

                let time
                const timeout = this._connection.configurations.options.rcpTimeout

                if (timeout > 0) {
                    new Promise<any>((res) => {
                        time = setTimeout(res, timeout)
                    }).then(() => {
                        reject(new Error('rpc timed out'))
                    })
                }

                exchange.rpc(resource, resource.resourceName, (err, msg) => {
                    clearTimeout(time)

                    const mensage = msg.getContent()

                    if (err) {
                        return reject(err)
                    }

                    return resolve(mensage)

                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!')

            } catch (err) {
                return reject(err)
            }
        })
    }

    public closeConnection(): Promise<boolean> {
        return this._connection.closeConnection()
    }

}
