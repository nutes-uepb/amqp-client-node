"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const identifier_1 = require("../../../di/identifier");
const di_1 = require("../../../di/di");
class ServerRegisterRabbitmq {
    constructor(_connection, _queueName, _exchangeName, _routingKey, _options) {
        this._connection = _connection;
        this._queueName = _queueName;
        this._exchangeName = _exchangeName;
        this._routingKey = _routingKey;
        this._options = _options;
        this.resource_handlers = new Map();
        this.consumersInitialized = new Map();
        this._logger = di_1.DI.get(identifier_1.Identifier.CUSTOM_LOGGER);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this
                    .registerRoutingKeyServer(this._queueName, this._exchangeName, this._routingKey, this._options);
                return Promise.resolve();
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    addResource(resourceName, resource) {
        const resourceHandler = {
            resource_name: resourceName,
            handle: resource
        };
        return this.registerResource(this._queueName, resourceHandler);
    }
    removeResource(resourceName) {
        return this.unregisterResource(this._queueName, resourceName);
    }
    getAllResource() {
        const resources = this.getResource();
        if (resources)
            return resources;
        else
            return {};
    }
    registerResource(queueName, resource) {
        const resources_handler = this.resource_handlers.get(queueName);
        if (!resources_handler) {
            this.resource_handlers.set(queueName, [resource]);
            this._logger.info('Resource ' + queueName + ' registered!');
            return true;
        }
        for (const actualResource of resources_handler) {
            if (actualResource.resource_name === resource.resource_name) {
                return false;
            }
        }
        resources_handler.push(resource);
        this.resource_handlers.set(queueName, resources_handler);
        this._logger.info('Resource ' + queueName + ' registered!');
        return true;
    }
    unregisterResource(queueName, resourceName) {
        const resources_handler = this.resource_handlers.get(queueName);
        if (!resources_handler) {
            return false;
        }
        for (const index in resources_handler) {
            if (resources_handler[index].resource_name === resourceName) {
                resources_handler.splice(Number(index), 1);
                this.resource_handlers.set(queueName, resources_handler);
                return true;
            }
        }
    }
    getResource() {
        return this.resource_handlers;
    }
    registerRoutingKeyServer(queueName, exchangeName, routingKey, options) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._connection && !this._connection.isConnected)
                    return reject(new Error('Connection Failed'));
                let exchangeOptions;
                let queueOptions;
                if (options) {
                    exchangeOptions = options.exchange;
                    queueOptions = options.queue;
                }
                const exchange = yield this._connection.getExchange(exchangeName, exchangeOptions);
                this._logger.info('Exchange creation ' + exchange.name + ' realized with success!');
                const queue = this._connection.getQueue(queueName, queueOptions);
                this._logger.info('Queue creation ' + queue.name + ' realized with success!');
                if (yield exchange.initialized) {
                    this._logger.info('RoutingKey ' + routingKey + ' registered!');
                    yield queue.bind(exchange, routingKey);
                }
                if (!this.consumersInitialized.get(queueName)) {
                    this.consumersInitialized.set(queueName, true);
                    yield queue.activateConsumer((message) => {
                        message.ack();
                        const clientRequest = message.getContent();
                        const resources_handler = this.resource_handlers.get(queueName);
                        if (resources_handler) {
                            for (const resource of resources_handler) {
                                if (resource.resource_name === clientRequest.resource_name) {
                                    try {
                                        return resource.handle.apply('', clientRequest.handle);
                                    }
                                    catch (err) {
                                        this._logger.error(`Consumer function returned error: ${err.message}`);
                                        return err;
                                    }
                                }
                            }
                        }
                        return new Error('Resource not registered in server');
                    }, { noAck: false }).then((result) => {
                        this._logger.info('Server registered in ' + exchangeName + ' exchange!');
                    })
                        .catch(err => {
                        console.log(err);
                    });
                }
                return resolve(true);
            }
            catch (err) {
                return reject(err);
            }
        }));
    }
}
exports.ServerRegisterRabbitmq = ServerRegisterRabbitmq;
