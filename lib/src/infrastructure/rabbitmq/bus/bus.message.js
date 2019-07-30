"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_factory_rabbitmq_1 = require("../connection/connection.factory.rabbitmq");
const queue_1 = require("./queue");
class BusMessage {
    constructor(content, options = {}) {
        this._properties = options;
        if (content !== undefined) {
            this.contentBuffer = content;
        }
    }
    set contentBuffer(content) {
        if (content instanceof Error) {
            this.properties.type = 'error';
            content = content.message;
        }
        if (typeof content === 'string') {
            this._contentBuffer = new Buffer(content);
        }
        else if (!(content instanceof Buffer)) {
            this._contentBuffer = Buffer.from(JSON.stringify(content));
            this._properties.contentType = 'application/json';
        }
        else {
            this._contentBuffer = content;
        }
        let parseContent = this._contentBuffer.toString();
        if (this._properties.contentType === 'application/json') {
            parseContent = JSON.parse(parseContent);
        }
        this._content = parseContent;
    }
    get contentBuffer() {
        return this._contentBuffer;
    }
    get content() {
        return this._content;
    }
    get fields() {
        return this._fields;
    }
    set fields(value) {
        this._fields = value;
    }
    get properties() {
        return this._properties;
    }
    set properties(value) {
        this._properties = value;
    }
    set channel(value) {
        this._channel = value;
    }
    set message(value) {
        this._message = value;
    }
    sendTo(destination, routingKey = '') {
        const sendMessage = () => {
            try {
                destination.channel.publish(exchange, routingKey, this._contentBuffer, this._properties);
            }
            catch (err) {
                connection_factory_rabbitmq_1.log.log('debug', 'Publish error11: ' + err.messageBus, { module: 'amqp-ts' });
                const destinationName = destination.name;
                const connection = destination.connection;
                connection_factory_rabbitmq_1.log.log('debug', 'Try to rebuild connection, before Call.', { module: 'amqp-ts' });
                connection._rebuildAll(err).then(() => {
                    connection_factory_rabbitmq_1.log.log('debug', 'Retransmitting message.', { module: 'amqp-ts' });
                    if (destination instanceof queue_1.Queue) {
                        connection.queues[destinationName].publish(this._contentBuffer, this._properties);
                    }
                    else {
                        connection.exchanges[destinationName].publish(this._contentBuffer, routingKey, this._properties);
                    }
                });
            }
        };
        let exchange;
        if (destination instanceof queue_1.Queue) {
            exchange = '';
            routingKey = destination.name;
        }
        else {
            exchange = destination.name;
        }
        destination.initialized.then(sendMessage);
    }
    ack(allUpTo) {
        if (this._channel !== undefined) {
            this._channel.ack(this._message, allUpTo);
        }
    }
    nack(allUpTo, requeue) {
        if (this._channel !== undefined) {
            this._channel.nack(this._message, allUpTo, requeue);
        }
    }
    reject(requeue = false) {
        if (this._channel !== undefined) {
            this._channel.reject(this._message, requeue);
        }
    }
}
exports.BusMessage = BusMessage;
