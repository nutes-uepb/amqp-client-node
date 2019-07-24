import { IClientRequest } from '../../port/rpc/resource.handler.interface'
import { inject, injectable } from 'inversify'
import { Identifier } from '../../../di/identifier'
import { ICustomLogger } from '../../../utils/custom.logger'
import { IConnection } from '../../port/connection/connection.interface'
import { IClientRegister } from '../../port/rpc/client.register.interface'
import { ICustomEventEmitter } from '../../../utils/custom.event.emitter'
import { ICommunicationConfig } from '../../../application/port/communications.options.interface'
import { IMessage, IMessageField, IMessageProperty } from '../../../application/port/message.interface'
import { Message } from '../bus/message'

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
                const timeout = this._connection.options.rcp_timeout

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

                    const message: IMessage = this.createMessage(msg)

                    return resolve(message)
                })

                this._logger.info('Client registered in ' + exchangeName + ' exchange!')

            } catch (err) {
                return reject(err)
            }
        })
    }

    private createMessage(message: Message): IMessage {
        const msg = {
            properties: {
                priority: message.properties.priority,
                expiration: message.properties.expiration,
                message_id: message.properties.messageId,
                timestamp: message.properties.timestamp,
                user_id: message.properties.userId,
                app_id: message.properties.appId,
                cluster_id: message.properties.clusterId,
                cc: message.properties.cc,
                bcc: message.properties.bcc
            } as IMessageProperty,
            content: message.getContent(),
            fields: {
                consumer_tag: message.fields.consumerTag,
                delivery_tag: message.fields.deliveryTag,
                redelivered: message.fields,
                exchange: message.fields.exchange,
                routing_key: message.fields.routingKey
            } as IMessageField
        } as IMessage

        return msg
    }

}
