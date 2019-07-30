"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_factory_rabbitmq_1 = require("../connection/connection.factory.rabbitmq");
const binding_1 = require("./binding");
const bus_message_1 = require("./bus.message");
const DIRECT_REPLY_TO_QUEUE = 'amq.rabbitmq.reply-to';
class Queue {
    constructor(connection, name, options = {}) {
        this._connection = connection;
        this._name = name;
        this._options = options;
        this._connection.queues[this._name] = this;
        this._initialize();
    }
    get initialized() {
        return this._initialized;
    }
    _initialize() {
        this._initialized = new Promise((resolve, reject) => {
            this._connection.initialized.then(() => {
                this._connection.connection.createChannel((err, channel) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this._channel = channel;
                        const callback = (e, ok) => {
                            if (e) {
                                connection_factory_rabbitmq_1.log.log('error', 'Failed to create queue \'' + this._name + '\'.', { module: 'amqp-ts' });
                                delete this._connection.queues[this._name];
                                reject(e);
                            }
                            else {
                                if (this._options.prefetch) {
                                    this._channel.prefetch(this._options.prefetch);
                                }
                                resolve(ok);
                            }
                        };
                        if (this._options.noCreate) {
                            this._channel.checkQueue(this._name, callback);
                        }
                        else {
                            this._channel.assertQueue(this._name, this._options, callback);
                        }
                    }
                });
            }).catch((err) => {
                connection_factory_rabbitmq_1.log.log('warn', 'Channel failure, error caused during connection!', { module: 'amqp-ts' });
            });
        });
    }
    static _packMessageContent(content, options) {
        if (typeof content === 'string') {
            content = new Buffer(content);
        }
        else if (!(content instanceof Buffer)) {
            content = new Buffer(JSON.stringify(content));
            options.contentType = 'application/json';
        }
        return content;
    }
    static _unpackMessageContent(msg) {
        let content = msg.content.toString();
        if (msg.properties.contentType === 'application/json') {
            content = JSON.parse(content);
        }
        return content;
    }
    publish(content, options = {}) {
        console.log('HERE0');
        const sendMessage = () => {
            try {
                this._channel.sendToQueue(this._name, content, options);
            }
            catch (err) {
                connection_factory_rabbitmq_1.log.log('debug', 'Queue publish error: ' + err.messageBus, { module: 'amqp-ts' });
                const queueName = this._name;
                const connection = this._connection;
                connection_factory_rabbitmq_1.log.log('debug', 'Try to rebuild connection, before Call.', { module: 'amqp-ts' });
                connection._rebuildAll(err).then(() => {
                    connection_factory_rabbitmq_1.log.log('debug', 'Retransmitting message.', { module: 'amqp-ts' });
                    connection.queues[queueName].publish(content, options);
                });
            }
        };
        content = Queue._packMessageContent(content, options);
        this._initialized.then(sendMessage);
    }
    send(message, routingKey = '') {
        message.sendTo(this, routingKey);
    }
    rpc(requestParameters) {
        return new Promise((resolve, reject) => {
            const processRpc = () => {
                let consumerTag;
                this._channel.consume(DIRECT_REPLY_TO_QUEUE, (resultMsg) => {
                    this._channel.cancel(consumerTag);
                    const result = new bus_message_1.BusMessage(resultMsg.content, resultMsg.fields);
                    result.fields = resultMsg.fields;
                    resolve(result);
                }, { noAck: true }, (err, ok) => {
                    if (err) {
                        reject(new Error('amqp-ts: Queue.rpc error: ' + err.messageBus));
                    }
                    else {
                        consumerTag = ok.consumerTag;
                        const message = new bus_message_1.BusMessage(requestParameters, { replyTo: DIRECT_REPLY_TO_QUEUE });
                        message.sendTo(this);
                    }
                });
            };
            const sync = false;
            this._initialized.then(() => sync);
            this._initialized.then(processRpc);
        });
    }
    prefetch(count) {
        this._initialized.then(() => {
            this._channel.prefetch(count);
            this._options.prefetch = count;
        });
    }
    recover() {
        return new Promise((resolve, reject) => {
            this._initialized.then(() => {
                this._channel.recover((err, ok) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(null);
                    }
                });
            });
        });
    }
    startConsumer(onMessage, options = {}) {
        if (this._consumerInitialized) {
            return new Promise((_, reject) => {
                reject(new Error('amqp-ts Queue.startConsumer error: consumer already defined'));
            });
        }
        this._isStartConsumer = true;
        this._rawConsumer = (options.rawMessage === true);
        delete options.rawMessage;
        this._consumerOptions = options;
        this._consumer = onMessage;
        this._initializeConsumer();
        return this._consumerInitialized;
    }
    activateConsumer(onMessage, options = {}) {
        if (this._consumerInitialized) {
            return new Promise((_, reject) => {
                reject(new Error('amqp-ts Queue.activateConsumer error: consumer already defined'));
            });
        }
        this._consumerOptions = options;
        this._consumer = onMessage;
        this._initializeConsumer();
        return this._consumerInitialized;
    }
    _initializeConsumer() {
        const processedMsgConsumer = (msg) => {
            try {
                if (!msg) {
                    return;
                }
                const payload = Queue._unpackMessageContent(msg);
                let result = this._consumer(payload);
                if (msg.properties.replyTo) {
                    const options = {};
                    if (result instanceof Promise) {
                        result.then((resultValue) => {
                            resultValue = Queue._packMessageContent(result, options);
                            this._channel.sendToQueue(msg.properties.replyTo, resultValue, options);
                        }).catch((err) => {
                            connection_factory_rabbitmq_1.log.log('error', 'Queue.onMessage RPC promise returned error: '
                                + err.messageBus, { module: 'amqp-ts' });
                        });
                    }
                    else {
                        result = Queue._packMessageContent(result, options);
                        this._channel.sendToQueue(msg.properties.replyTo, result, options);
                    }
                }
                if (this._consumerOptions.noAck !== true) {
                    this._channel.ack(msg);
                }
            }
            catch (err) {
                connection_factory_rabbitmq_1.log.log('error', 'Queue.onMessage consumer function returned error: ' + err.messageBus, { module: 'amqp-ts' });
            }
        };
        const rawMsgConsumer = (msg) => {
            try {
                this._consumer(msg, this._channel);
            }
            catch (err) {
                connection_factory_rabbitmq_1.log.log('error', 'Queue.onMessage consumer function returned error: ' + err.messageBus, { module: 'amqp-ts' });
            }
        };
        const activateConsumerWrapper = (msg) => {
            try {
                const message = new bus_message_1.BusMessage(msg.content, msg.properties);
                message.fields = msg.fields;
                message.message = msg;
                message.channel = this._channel;
                let result = this._consumer(message);
                if (msg.properties.replyTo) {
                    if (result instanceof Promise) {
                        result.then((resultValue) => {
                            if (!(resultValue instanceof bus_message_1.BusMessage)) {
                                resultValue = new bus_message_1.BusMessage(resultValue, {});
                            }
                            resultValue.properties.correlationId = msg.properties.correlationId;
                            this._channel.sendToQueue(msg.properties.replyTo, resultValue.contentBuffer, resultValue.properties);
                        }).catch((err) => {
                            connection_factory_rabbitmq_1.log.log('error', 'Queue.onMessage RPC promise returned error: '
                                + err.messageBus, { module: 'amqp-ts' });
                        });
                    }
                    else {
                        if (!(result instanceof bus_message_1.BusMessage)) {
                            result = new bus_message_1.BusMessage(result, {});
                        }
                        result.properties.correlationId = msg.properties.correlationId;
                        this._channel.sendToQueue(msg.properties.replyTo, result.contentBuffer, result.properties);
                    }
                }
            }
            catch (err) {
                connection_factory_rabbitmq_1.log.log('error', 'Queue.onMessage consumer function returned error: ' + err.messageBus, { module: 'amqp-ts' });
            }
        };
        this._consumerInitialized = new Promise((resolve, reject) => {
            this._initialized.then(() => {
                let consumerFunction = activateConsumerWrapper;
                if (this._isStartConsumer) {
                    consumerFunction = this._rawConsumer ? rawMsgConsumer : processedMsgConsumer;
                }
                this._channel.consume(this._name, consumerFunction, this._consumerOptions, (err, ok) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this._consumerTag = ok.consumerTag;
                        resolve(ok);
                    }
                });
            });
        });
    }
    stopConsumer() {
        if (!this._consumerInitialized || this._consumerStopping) {
            return Promise.resolve();
        }
        this._consumerStopping = true;
        return new Promise((resolve, reject) => {
            this._consumerInitialized.then(() => {
                this._channel.cancel(this._consumerTag, (err, ok) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        delete this._consumerInitialized;
                        delete this._consumer;
                        delete this._consumerOptions;
                        delete this._consumerStopping;
                        resolve(null);
                    }
                });
            });
        });
    }
    delete() {
        if (this._deleting === undefined) {
            this._deleting = new Promise((resolve, reject) => {
                this._initialized.then(() => {
                    return binding_1.Binding.removeBindingsContaining(this);
                }).then(() => {
                    return this.stopConsumer();
                }).then(() => {
                    return this._channel.deleteQueue(this._name, {}, (err, ok) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            delete this._initialized;
                            delete this._connection.queues[this._name];
                            this._channel.close((e) => {
                                if (e) {
                                    reject(e);
                                }
                                else {
                                    delete this._channel;
                                    delete this._connection;
                                    resolve(ok);
                                }
                            });
                        }
                    });
                }).catch((err) => {
                    reject(err);
                });
            });
        }
        return this._deleting;
    }
    close() {
        if (this._closing === undefined) {
            this._closing = new Promise((resolve, reject) => {
                this._initialized.then(() => {
                    return binding_1.Binding.removeBindingsContaining(this);
                }).then(() => {
                    return this.stopConsumer();
                }).then(() => {
                    delete this._initialized;
                    delete this._connection.queues[this._name];
                    this._channel.close((err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            delete this._channel;
                            delete this._connection;
                            resolve(null);
                        }
                    });
                }).catch((err) => {
                    reject(err);
                });
            });
        }
        return this._closing;
    }
    bind(source, pattern = '', args = {}) {
        const binding = new binding_1.Binding(this, source, pattern, args);
        return binding.initialized;
    }
    unbind(source, pattern = '', args = {}) {
        return this._connection.bindings[binding_1.Binding.id(this, source, pattern)].delete();
    }
    get connection() {
        return this._connection;
    }
    get channel() {
        return this._channel;
    }
    get name() {
        return this._name;
    }
    get consumer() {
        return this._consumer;
    }
    get consumerInitialized() {
        return this._consumerInitialized;
    }
}
exports.Queue = Queue;
