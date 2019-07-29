"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_factory_rabbitmq_1 = require("../connection/connection.factory.rabbitmq");
const queue_1 = require("./queue");
class Binding {
    constructor(destination, source, pattern = '', args = {}) {
        this._source = source;
        this._destination = destination;
        this._pattern = pattern;
        this._args = args;
        this._destination.connection.bindings[Binding.id(this._destination, this._source, this._pattern)] = this;
        this.initialize();
    }
    initialize() {
        this._initialized = new Promise((resolve, reject) => {
            if (this._destination instanceof queue_1.Queue) {
                const queue = this._destination;
                queue.initialized.then(() => {
                    queue.channel.bindQueue(this._destination.name, this._source.name, this._pattern, this._args, (err, ok) => {
                        if (err) {
                            connection_factory_rabbitmq_1.log.log('error', 'Failed to create queue binding (' +
                                this._source.name + '->' + this._destination.name + ')', { module: 'amqp-ts' });
                            delete this._destination.connection
                                .bindings[Binding.id(this._destination, this._source, this._pattern)];
                            reject(err);
                        }
                        else {
                            resolve(this);
                        }
                    });
                });
            }
            else {
                const exchange = this._destination;
                exchange.initialized.then(() => {
                    exchange.channel.bindExchange(this._destination.name, this._source.name, this._pattern, this._args, (err, ok) => {
                        if (err) {
                            connection_factory_rabbitmq_1.log.log('error', 'Failed to create exchange binding (' +
                                this._source.name + '->' + this._destination.name + ')', { module: 'amqp-ts' });
                            delete this._destination.connection
                                .bindings[Binding.id(this._destination, this._source, this._pattern)];
                            reject(err);
                        }
                        else {
                            resolve(this);
                        }
                    });
                });
            }
        });
    }
    delete() {
        return new Promise((resolve, reject) => {
            if (this._destination instanceof queue_1.Queue) {
                const queue = this._destination;
                queue.initialized.then(() => {
                    queue.channel.unbindQueue(this._destination.name, this._source.name, this._pattern, this._args, (err, ok) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            delete this._destination.connection
                                .bindings[Binding.id(this._destination, this._source, this._pattern)];
                            resolve(null);
                        }
                    });
                });
            }
            else {
                const exchange = this._destination;
                exchange.initialized.then(() => {
                    exchange.channel.unbindExchange(this._destination.name, this._source.name, this._pattern, this._args, (err, ok) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            delete this._destination.connection
                                .bindings[Binding.id(this._destination, this._source, this._pattern)];
                            resolve(null);
                        }
                    });
                });
            }
        });
    }
    static id(destination, source, pattern) {
        pattern = pattern || '';
        return '[' + source.name + ']to' + (destination instanceof queue_1.Queue ? 'Queue' : 'Exchange')
            + '[' + destination.name + ']' + pattern;
    }
    static removeBindingsContaining(connectionPoint) {
        const connection = connectionPoint.connection;
        const promises = [];
        for (const bindingId of Object.keys(connection.bindings)) {
            const binding = connection.bindings[bindingId];
            if (binding._source === connectionPoint || binding._destination === connectionPoint) {
                promises.push(binding.delete());
            }
        }
        return Promise.all(promises);
    }
    get initialized() {
        return this._initialized;
    }
    get source() {
        return this._source;
    }
    get destination() {
        return this._destination;
    }
}
exports.Binding = Binding;
