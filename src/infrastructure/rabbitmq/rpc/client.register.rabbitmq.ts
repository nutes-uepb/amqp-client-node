import { IClientRequest } from '../../port/rpc/resource.handler.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IBusConnection } from '../../port/connection/connection.interface'
import { IClientRegister } from '../../port/rpc/client.register.interface'
import { IClientOptions } from '../../../application/port/communication.option.interface'
import { IMessage } from '../../../application/port/message.interface'

const defClientOptions: IClientOptions = {
    rcpTimeout: 5000
}

@injectable()
export class ClientRegisterRabbitmq implements IClientRegister {

    private _connection: IBusConnection

    constructor(@inject(Identifier.CUSTOM_LOGGER) private readonly _logger: ICustomLogger) {
    }

    set connection(value: IBusConnection) {
        this._connection = value
    }

    public registerRoutingKeyClient(exchangeName: string,
                                    resource: IClientRequest,
                                    options: IClientOptions = defClientOptions): Promise<IMessage> {
        return new Promise<IMessage>(async (resolve, reject) => {
            try {
                if (this._connection && !this._connection.isConnected) {
                    return reject(new Error('Connection Failed'))
                }

                const exchange = this._connection.getExchange(exchangeName, options ? options.exchange : undefined)
                await exchange.initialized

                let time
                const timeout = options.rcpTimeout

                if (timeout > 0) {
                    new Promise<any>((res) => {
                        time = setTimeout(res, timeout)
                    }).then(() => {
                        reject(new Error('rpc timed out'))
                    })
                }

                exchange.rpc(resource, resource.resource_name, (err, msg) => {
                    clearTimeout(time)
                    if (err) return reject(err)
                    return resolve(msg)
                })
                this._logger.info('Client registered in ' + exchangeName + ' exchange!')
            } catch (err) {
                return reject(err)
            }
        })
    }
}
