"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Identifier {
}
Identifier.RABBITMQ_CONNECTION_FACT = Symbol.for('ConnectionFactoryRabbitMQ');
Identifier.RABBITMQ_CONNECTION = Symbol.for('ConnectionRabbitMQ');
Identifier.BUS_MESSAGE = Symbol.for('BusMessage');
Identifier.CUSTOM_LOGGER = Symbol.for('CustomLogger');
Identifier.RABBITMQ_MENSSAGE_SENDER = Symbol.for('MessageSender');
Identifier.RABBITMQ_MENSSAGE_RECEIVER = Symbol.for('MessageReceiver');
Identifier.RABBITMQ_CLIENT_REGISTER = Symbol.for('ClientRegister');
Identifier.RABBITMQ_SERVER_REGISTER = Symbol.for('ServerRegister');
Identifier.TOPIC_DIRECT = Symbol.for('Topic_Direct');
Identifier.TOPIC = Symbol.for('Topic');
Identifier.DIRECT = Symbol.for('Direct');
Identifier.CUSTOM_EVENT_EMITTER = Symbol.for('CustomEventEmitter');
exports.Identifier = Identifier;
