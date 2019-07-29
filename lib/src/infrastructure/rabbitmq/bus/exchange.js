"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const connection_factory_rabbitmq_1 = require("../connection/connection.factory.rabbitmq");
const binding_1 = require("./binding");
const message_1 = require("./message");
const path = __importStar(require("path"));
const ApplicationName = process.env.AMQPTS_APPLICATIONNAME ||
    (path.parse ? path.parse(process.argv[1]).name : path.basename(process.argv[1]));
const DIRECT_REPLY_TO_QUEUE = 'amq.rabbitmq.reply-to';
class Exchange {
    constructor(connection, name, type, options = {}) {
        this._consumer_handlers = new Array();
        this._isConsumerInitializedRcp = false;
        this._connection = connection;
        this._name = name;
        this._type = type;
        this._options = options;
        this._initialize();
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
                                connection_factory_rabbitmq_1.log.log('error', 'Failed to create exchange \'' + this._name + '\'.', { module: 'amqp-ts' });
                                delete this._connection.exchanges[this._name];
                                reject(e);
                            }
                            else {
                                resolve(ok);
                            }
                        };
                        if (this._options.no_create) {
                            this._channel.checkExchange(this._name, callback);
                        }
                        else {
                            this._channel.assertExchange(this._name, this._type, this._options, callback);
                        }
                    }
                });
            }).catch((err) => {
                connection_factory_rabbitmq_1.log.log('warn', 'Channel failure, error caused during connection!', { module: 'amqp-ts' });
            });
        });
        this._connection.exchanges[this._name] = this;
    }
    publish(content, routingKey = '', options = {}) {
        if (typeof content === 'string') {
            content = new Buffer(content);
        }
        else if (!(content instanceof Buffer)) {
            content = new Buffer(JSON.stringify(content));
            options.contentType = options.contentType || 'application/json';
        }
        this._initialized.then(() => {
            try {
                this._channel.publish(this._name, routingKey, content, options);
            }
            catch (err) {
                connection_factory_rabbitmq_1.log.log('warn', 'Exchange publish error: ' + err.message, { module: 'amqp-ts' });
                const exchangeName = this._name;
                const connection = this._connection;
                connection._rebuildAll(err).then(() => {
                    connection_factory_rabbitmq_1.log.log('debug', 'Retransmitting message.', { module: 'amqp-ts' });
                    connection.exchanges[exchangeName].publish(content, routingKey, options);
                });
            }
        });
    }
    send(message, routingKey = '') {
        message.sendTo(this, routingKey);
    }
    rpc(requestParameters, routingKey = '', callback) {
        function generateUuid() {
            return Math.random().toString() +
                Math.random().toString() +
                Math.random().toString();
        }
        const processRpc = () => {
            const uuid = generateUuid();
            if (!this._isConsumerInitializedRcp) {
                this._isConsumerInitializedRcp = true;
                this._channel.consume(DIRECT_REPLY_TO_QUEUE, (resultMsg) => {
                    const result = new message_1.Message(resultMsg.content, resultMsg.properties);
                    result.fields = resultMsg.fields;
                    for (const handler of this._consumer_handlers) {
                        if (handler[0] === resultMsg.properties.correlationId) {
                            const func = handler[1];
                            if (result.properties.type === 'error') {
                                func.apply('', [new Error(result.getContent()), undefined]);
                                return;
                            }
                            func.apply('', [undefined, result]);
                        }
                    }
                }, { noAck: true });
            }
            this._consumer_handlers.push([uuid, callback]);
            const message = new message_1.Message(requestParameters, { correlationId: uuid, replyTo: DIRECT_REPLY_TO_QUEUE });
            message.sendTo(this, routingKey);
        };
        this._initialized.then(processRpc);
    }
    delete() {
        if (this._deleting === undefined) {
            this._deleting = new Promise((resolve, reject) => {
                this._initialized.then(() => {
                    return binding_1.Binding.removeBindingsContaining(this);
                }).then(() => {
                    this._channel.deleteExchange(this._name, {}, (err, ok) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            this._channel.close((e) => {
                                delete this._initialized;
                                delete this._connection.exchanges[this._name];
                                if (e) {
                                    reject(e);
                                }
                                else {
                                    delete this._channel;
                                    delete this._connection;
                                    resolve(null);
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
                    delete this._initialized;
                    delete this._connection.exchanges[this._name];
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
    consumerQueueName() {
        return this._name + '.' + ApplicationName + '.' + os.hostname() + '.' + process.pid;
    }
    startConsumer(onMessage, options) {
        const queueName = this.consumerQueueName();
        if (this._connection.queues[queueName]) {
            return new Promise((_, reject) => {
                reject(new Error('amqp-ts Exchange.startConsumer error: consumer already defined'));
            });
        }
        else {
            const promises = [];
            const queue = this._connection.declareQueue(queueName, { durable: false });
            promises.push(queue.initialized);
            const binding = queue.bind(this);
            promises.push(binding);
            const consumer = queue.startConsumer(onMessage, options);
            promises.push(consumer);
            return Promise.all(promises);
        }
    }
    activateConsumer(onMessage, options) {
        const queueName = this.consumerQueueName();
        if (this._connection.queues[queueName]) {
            return new Promise((_, reject) => {
                reject(new Error('amqp-ts Exchange.activateConsumer error: consumer already defined'));
            });
        }
        else {
            const promises = [];
            const queue = this._connection.declareQueue(queueName, { durable: false });
            promises.push(queue.initialized);
            const binding = queue.bind(this);
            promises.push(binding);
            const consumer = queue.activateConsumer(onMessage, options);
            promises.push(consumer);
            return Promise.all(promises);
        }
    }
    stopConsumer() {
        const queue = this._connection.queues[this.consumerQueueName()];
        if (queue) {
            return queue.delete();
        }
        else {
            return Promise.resolve();
        }
    }
    get initialized() {
        return this._initialized;
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
    get type() {
        return this._type;
    }
}
exports.Exchange = Exchange;
