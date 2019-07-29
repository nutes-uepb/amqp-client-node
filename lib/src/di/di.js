"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const inversify_1 = require("inversify");
const identifier_1 = require("./identifier");
const connection_rabbitmq_1 = require("../infrastructure/rabbitmq/connection/connection.rabbitmq");
const custom_logger_1 = require("../utils/custom.logger");
const message_receiver_rabbitmq_1 = require("../infrastructure/rabbitmq/pubsub/message.receiver.rabbitmq");
const message_sender_rabbitmq_1 = require("../infrastructure/rabbitmq/pubsub/message.sender.rabbitmq");
const client_register_rabbitmq_1 = require("../infrastructure/rabbitmq/rpc/client.register.rabbitmq");
const custom_event_emitter_1 = require("../utils/custom.event.emitter");
const connection_factory_rabbitmq_1 = require("../infrastructure/rabbitmq/connection/connection.factory.rabbitmq");
class DependencyInject {
    constructor() {
        this.container = new inversify_1.Container();
        this.initDependencies();
    }
    getContainer() {
        return this.container;
    }
    initDependencies() {
        this.container.bind(identifier_1.Identifier.RABBITMQ_MENSSAGE_SENDER)
            .to(message_sender_rabbitmq_1.MessageSenderRabbitmq);
        this.container.bind(identifier_1.Identifier.RABBITMQ_MENSSAGE_RECEIVER)
            .to(message_receiver_rabbitmq_1.MessageReceiverRabbitmq);
        this.container.bind(identifier_1.Identifier.RABBITMQ_CLIENT_REGISTER)
            .to(client_register_rabbitmq_1.ClientRegisterRabbitmq);
        this.container.bind(identifier_1.Identifier.RABBITMQ_CONNECTION_FACT)
            .to(connection_factory_rabbitmq_1.ConnectionFactoryRabbitMQ);
        this.container.bind(identifier_1.Identifier.RABBITMQ_CONNECTION)
            .to(connection_rabbitmq_1.ConnectionRabbitMQ);
        this.container.bind(identifier_1.Identifier.CUSTOM_EVENT_EMITTER)
            .to(custom_event_emitter_1.CustomEventEmitter);
        this.container.bind(identifier_1.Identifier.CUSTOM_LOGGER)
            .to(custom_logger_1.CustomLogger).inSingletonScope();
    }
}
exports.DI = new DependencyInject().getContainer();
