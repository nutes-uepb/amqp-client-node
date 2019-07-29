"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("../bus/queue");
const exchange_1 = require("../bus/exchange");
const AmqpLib = __importStar(require("amqplib/callback_api"));
const winston_1 = require("winston");
const inversify_1 = require("inversify");
const events_1 = require("events");
const amqp_log = winston_1.createLogger({
    level: 'silly',
    silent: true,
    format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
    transports: new winston_1.transports.Console(this._options),
    exitOnError: false
});
exports.log = amqp_log;
let ConnectionFactoryRabbitMQ = class ConnectionFactoryRabbitMQ extends events_1.EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.connectedBefore = false;
        this._rebuilding = false;
        this._isClosing = false;
    }
    createConnection(url, socketOptions = {}, reconnectStrategy) {
        return __awaiter(this, void 0, void 0, function* () {
            this.url = url;
            this.socketOptions = socketOptions;
            this.reconnectStrategy = reconnectStrategy;
            this._exchanges = {};
            this._queues = {};
            this._bindings = {};
            this.rebuildConnection();
            return Promise.resolve(this);
        });
    }
    rebuildConnection() {
        if (this._rebuilding) {
            exports.log.log('debug', 'ConnectionFactoryRabbitMQ rebuild already in progress, ' +
                'joining active rebuild attempt.', { module: 'amqp-ts' });
            return this.initialized;
        }
        this._retry = -1;
        this._rebuilding = true;
        this._isClosing = false;
        this.initialized = new Promise((resolve, reject) => {
            this.tryToConnect(this, 0, (err) => {
                if (err) {
                    this._rebuilding = false;
                    reject(err);
                }
                else {
                    this._rebuilding = false;
                    if (this.connectedBefore) {
                        exports.log.log('warn', 'ConnectionFactoryRabbitMQ re-established', { module: 'amqp-ts' });
                        this.emit('re_established_connection');
                    }
                    else {
                        exports.log.log('info', 'ConnectionFactoryRabbitMQ established.', { module: 'amqp-ts' });
                        this.emit('open_connection');
                        this.connectedBefore = true;
                    }
                    resolve(null);
                }
            });
        });
        this.initialized.catch((err) => {
            exports.log.log('warn', 'Error creating connection!', { module: 'amqp-ts' });
            this.emit('error_connection', err);
        });
        return this.initialized;
    }
    tryToConnect(thisConnection, retry, callback) {
        AmqpLib.connect(thisConnection.url, thisConnection.socketOptions, (err, connection) => {
            if (err) {
                thisConnection.isConnected = false;
                if (retry <= this._retry) {
                    return;
                }
                exports.log.log('warn', 'ConnectionFactoryRabbitMQ failed.', { module: 'amqp-ts' });
                this._retry = retry;
                if (thisConnection.reconnectStrategy.retries === 0 || thisConnection.reconnectStrategy.retries > retry) {
                    exports.log.log('warn', 'ConnectionFactoryRabbitMQ retry ' + (retry + 1) +
                        ' in ' + thisConnection.reconnectStrategy.interval + 'ms', { module: 'amqp-ts' });
                    thisConnection.emit('trying_connect');
                    setTimeout(thisConnection.tryToConnect, thisConnection.reconnectStrategy.interval, thisConnection, retry + 1, callback);
                }
                else {
                    exports.log.log('warn', 'ConnectionFactoryRabbitMQ failed, exiting: No connection ' +
                        'retries left (retry ' + retry + ').', { module: 'amqp-ts' });
                    callback(err);
                }
            }
            else {
                const restart = (e) => {
                    exports.log.log('debug', 'ConnectionFactoryRabbitMQ error occurred.', { module: 'amqp-ts' });
                    connection.removeListener('error', restart);
                    thisConnection._rebuildAll(e);
                };
                const onClose = () => {
                    connection.removeListener('close', onClose);
                    if (!this._isClosing) {
                        thisConnection.emit('lost_connection');
                        restart(new Error('ConnectionFactoryRabbitMQ closed by remote host'));
                    }
                };
                connection.on('error', restart);
                connection.on('close', onClose);
                thisConnection._connection = connection;
                thisConnection.isConnected = true;
                callback(null);
            }
        });
    }
    _rebuildAll(err) {
        exports.log.log('warn', 'ConnectionFactoryRabbisssssstMQ error: ' + err.message, { module: 'amqp-ts' });
        exports.log.log('debug', 'Rebuilding connection NOW.', { module: 'amqp-ts' });
        this.rebuildConnection();
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange = this._exchanges[exchangeId];
            exports.log.log('debug', 'Re-initialize Exchange \'' + exchange.name + '\'.', { module: 'amqp-ts' });
            exchange._initialize();
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue = this._queues[queueId];
            const consumer = queue.consumer;
            exports.log.log('debug', 'Re-initialize queue \'' + queue.name + '\'.', { module: 'amqp-ts' });
            queue._initialize();
            if (consumer) {
                exports.log.log('debug', 'Re-initialize consumer for queue \'' + queue.name + '\'.', { module: 'amqp-ts' });
                queue._initializeConsumer();
            }
        }
        for (const bindingId of Object.keys(this._bindings)) {
            const binding = this._bindings[bindingId];
            exports.log.log('debug', 'Re-initialize binding from \'' + binding.source.name + '\' to \'' +
                binding.destination.name + '\'.', { module: 'amqp-ts' });
            binding.initialize();
        }
        return new Promise((resolve, reject) => {
            this.completeConfiguration().then(() => {
                exports.log.log('debug', 'Rebuild success.', { module: 'amqp-ts' });
                resolve(null);
            }, (rejectReason) => {
                exports.log.log('debug', 'Rebuild failed.', { module: 'amqp-ts' });
                reject(rejectReason);
            });
        });
    }
    close() {
        this._isClosing = true;
        return new Promise((resolve, reject) => {
            this.initialized.then(() => {
                this._connection.close(err => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this.isConnected = false;
                        this.emit('close_connection');
                        resolve(null);
                    }
                });
            });
        });
    }
    completeConfiguration() {
        const promises = [];
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange = this._exchanges[exchangeId];
            promises.push(exchange.initialized);
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue = this._queues[queueId];
            promises.push(queue.initialized);
            if (queue.consumerInitialized) {
                promises.push(queue.consumerInitialized);
            }
        }
        for (const bindingId of Object.keys(this._bindings)) {
            const binding = this._bindings[bindingId];
            promises.push(binding.initialized);
        }
        return Promise.all(promises);
    }
    deleteConfiguration() {
        const promises = [];
        for (const bindingId of Object.keys(this._bindings)) {
            const binding = this._bindings[bindingId];
            promises.push(binding.delete());
        }
        for (const queueId of Object.keys(this._queues)) {
            const queue = this._queues[queueId];
            if (queue.consumerInitialized) {
                promises.push(queue.stopConsumer());
            }
            promises.push(queue.delete());
        }
        for (const exchangeId of Object.keys(this._exchanges)) {
            const exchange = this._exchanges[exchangeId];
            promises.push(exchange.delete());
        }
        return Promise.all(promises);
    }
    declareExchange(name, type, options) {
        let exchange = this._exchanges[name];
        if (exchange === undefined) {
            exchange = new exchange_1.Exchange(this, name, type, options);
        }
        return exchange;
    }
    declareQueue(name, options) {
        let queue = this._queues[name];
        if (queue === undefined) {
            queue = new queue_1.Queue(this, name, options);
        }
        return queue;
    }
    declareTopology(topology) {
        const promises = [];
        let i;
        let len;
        if (topology.exchanges !== undefined) {
            for (i = 0, len = topology.exchanges.length; i < len; i++) {
                const exchange = topology.exchanges[i];
                promises.push(this.declareExchange(exchange.name, exchange.type, exchange.options).initialized);
            }
        }
        if (topology.queues !== undefined) {
            for (i = 0, len = topology.queues.length; i < len; i++) {
                const queue = topology.queues[i];
                promises.push(this.declareQueue(queue.name, queue.options).initialized);
            }
        }
        if (topology.bindings !== undefined) {
            for (i = 0, len = topology.bindings.length; i < len; i++) {
                const binding = topology.bindings[i];
                const source = this.declareExchange(binding.source);
                let destination;
                if (binding.exchange !== undefined) {
                    destination = this.declareExchange(binding.exchange);
                }
                else {
                    destination = this.declareQueue(binding.queue);
                }
                promises.push(destination.bind(source, binding.pattern, binding.args));
            }
        }
        return Promise.all(promises);
    }
    get connection() {
        return this._connection;
    }
    get exchanges() {
        return this._exchanges;
    }
    get queues() {
        return this._queues;
    }
    get bindings() {
        return this._bindings;
    }
};
ConnectionFactoryRabbitMQ = __decorate([
    inversify_1.injectable(),
    __metadata("design:paramtypes", [])
], ConnectionFactoryRabbitMQ);
exports.ConnectionFactoryRabbitMQ = ConnectionFactoryRabbitMQ;
