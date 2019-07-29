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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
const inversify_1 = require("inversify");
const identifier_1 = require("../../../di/identifier");
const fs = __importStar(require("fs"));
const type_communication_enum_1 = require("../../../application/port/type.communication.enum");
const defaultOptions = {
    retries: 0,
    interval: 1000
};
const defaultParams = {
    protocol: 'amqp',
    hostname: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    locale: 'en_US',
    frameMax: 0,
    heartbeat: 0,
    vhost: ''
};
let ConnectionRabbitMQ = class ConnectionRabbitMQ {
    constructor(_connectionFactory, _logger, _emitter) {
        this._connectionFactory = _connectionFactory;
        this._logger = _logger;
        this._emitter = _emitter;
        this._resourceBus = new Map();
    }
    set configurations(config) {
        this._configuration = config;
        if (!this._configuration) {
            this._configuration = defaultParams;
        }
    }
    set options(value) {
        this._options = value;
        if (!this._options) {
            this._options = defaultOptions;
        }
    }
    set idConnection(idConnection) {
        this._idConnection = idConnection;
    }
    get idConnection() {
        return this._idConnection;
    }
    get isConnected() {
        if (!this._connection)
            return false;
        return this._connection.isConnected;
    }
    get conn() {
        return this._connection;
    }
    connect() {
        return new Promise((resolve, reject) => {
            if (this.isConnected)
                return resolve();
            const sslParameters = {
                cert: undefined,
                key: undefined,
                passphrase: undefined,
                ca: []
            };
            if (this._options.ssl_options) {
                if (this._options.ssl_options.cert) {
                    sslParameters.cert = fs.readFileSync(this._options.ssl_options.cert);
                }
                if (this._options.ssl_options.key) {
                    sslParameters.cert = fs.readFileSync(this._options.ssl_options.key);
                }
                sslParameters.passphrase = this._options.ssl_options.passphrase;
                if (this._options.ssl_options.ca) {
                    for (const ca of this._options.ssl_options.ca) {
                        sslParameters.ca.push(fs.readFileSync(ca));
                    }
                }
            }
            this._connectionFactory
                .createConnection(this._configuration, sslParameters, {
                retries: this._options.retries,
                interval: this._options.interval
            })
                .then((connection) => __awaiter(this, void 0, void 0, function* () {
                this._connection = connection;
                this._connection.on('error_connection', (err) => {
                    this._logger.error('Error during connection ');
                    this._emitter.emit('error_connection', err);
                });
                this._connection.on('close_connection', () => {
                    this._logger.info('Close connection with success! ');
                    this._emitter.emit('close_connection');
                });
                this._connection.on('open_connection', () => {
                    this._logger.info('Connection established.');
                    this._emitter.emit('connected');
                });
                this._connection.on('lost_connection', () => {
                    this._logger.warn('Lost connection ');
                    this._emitter.emit('disconnected');
                });
                this._connection.on('trying_connect', () => {
                    this._logger.warn('Trying re-established connection');
                    this._emitter.emit('trying_connect');
                });
                this._connection.on('re_established_connection', () => {
                    this._logger.warn('Re-established connection');
                    this._emitter.emit('re_established_connection');
                });
                yield this._connection.initialized;
                return resolve();
            }))
                .catch(err => {
                return reject(err);
            });
        });
    }
    getExchange(exchangeName, option) {
        let typeCommunication = type_communication_enum_1.ETypeCommunication.TOPIC;
        let exchangeOptions = {};
        if (option) {
            exchangeOptions = Object.assign({}, option, { autoDelete: option.auto_delete, alternateExchange: option.alternate_exchange, noCreate: option.no_create });
            if (option.type)
                typeCommunication = option.type;
        }
        const exchange = this._connection.declareExchange(exchangeName, typeCommunication, exchangeOptions);
        if (!this._resourceBus.get(exchangeName)) {
            this._resourceBus.set(exchangeName, exchange);
        }
        return exchange;
    }
    getQueue(queueName, option) {
        let queueOpetions = {};
        if (option) {
            queueOpetions = Object.assign({}, option, { autoDelete: option.auto_delete, messageTtl: option.message_ttl, deadLetterExchange: option.dead_letter_exchange, maxLength: option.max_length, noCreate: option.no_create });
        }
        const queue = this._connection.declareQueue(queueName, queueOpetions);
        if (!this._resourceBus.get(queueName)) {
            this._resourceBus.set(queueName, queue);
        }
        return queue;
    }
    closeConnection() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (this.isConnected) {
                this._connection.close().then(() => {
                    return resolve(true);
                }).catch(err => {
                    return reject(err);
                });
            }
            return resolve(false);
        }));
    }
    disposeConnection() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (this.isConnected) {
                try {
                    for (const resource of this._resourceBus.keys()) {
                        yield this._resourceBus.get(resource).delete();
                    }
                    yield this.closeConnection();
                    return resolve(true);
                }
                catch (e) {
                    return reject(e);
                }
            }
            return resolve(false);
        }));
    }
    on(event, listener) {
        this._emitter.on(event, listener);
    }
};
ConnectionRabbitMQ = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(identifier_1.Identifier.RABBITMQ_CONNECTION_FACT)),
    __param(1, inversify_1.inject(identifier_1.Identifier.CUSTOM_LOGGER)),
    __param(2, inversify_1.inject(identifier_1.Identifier.CUSTOM_EVENT_EMITTER)),
    __metadata("design:paramtypes", [Object, Object, Object])
], ConnectionRabbitMQ);
exports.ConnectionRabbitMQ = ConnectionRabbitMQ;
