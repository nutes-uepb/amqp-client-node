import { decorate, inject, injectable } from 'inversify'
import { Identifier } from '../../di/identifier'
import { ETypeCommunication } from '../port/type.communication.enum'
import { Routingkey } from './base/routingkey'
import { IEventBus } from '../../infrastructure/port/event.bus.interface'
import { CustomEventEmitter } from '../../utils/custom.event.emitter'
import { ICustomLogger } from '../../utils/custom.logger'

@injectable()
export class Topic extends Routingkey {

    constructor(
        @inject(Identifier.EVENT_BUS) connection: IEventBus,
        @inject(Identifier.CUSTOM_EVENT_EMITTER) emitter: CustomEventEmitter,
        @inject(Identifier.CUSTOM_LOGGER) logger: ICustomLogger
    ) {
        super(connection, emitter, logger)
        super.typeConnection(ETypeCommunication.TOPIC)
    }

}
