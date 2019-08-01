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
Object.defineProperty(exports, "__esModule", { value: true });
const inversify_1 = require("inversify");
const identifier_1 = require("../../../di/identifier");
const defSubExchangeOptions = {
    receiveFromYourself: false
};
let MessageReceiverRabbitmq = class MessageReceiverRabbitmq {
    constructor(_logger) {
        this._logger = _logger;
        this.routing_key_handlers = new Map();
    }
    set connection(value) {
        this._connection = value;
    }
    receiveRoutingKeyMessage(queueName, exchangeName, routingKey, callback, options = defSubExchangeOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._connection && !this._connection.isConnected) {
                    return Promise.reject(new Error('Connection Failed'));
                }
                const exchange = this._connection.getExchange(exchangeName, options ? options.exchange : undefined);
                yield exchange.initialized;
                const queue = this._connection.getQueue(queueName, options ? options.queue : undefined);
                yield queue.initialized;
                this.routing_key_handlers.set(routingKey, callback);
                this._logger.info('Callback message ' + routingKey + ' registered!');
                yield queue.bind(exchange, routingKey);
                yield this.routingKeySubscriberConsumer(queue, options.consumer, options.receiveFromYourself);
                return Promise.resolve();
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    routingKeySubscriberConsumer(queue, consumer, receiveFromYourself = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!queue.consumerInitialized) {
                this._logger.info('Queue creation ' + queue.name + ' realized with success!');
                try {
                    yield queue.activateConsumer((message) => {
                        if (message.properties.correlationId === this._connection.idConnection &&
                            !receiveFromYourself) {
                            return;
                        }
                        this._logger.info(`Bus event message received with success!`);
                        const routingKey = message.fields.routingKey;
                        for (const entry of this.routing_key_handlers.keys()) {
                            if (this.regExpr(entry, routingKey)) {
                                const event_handler = this.routing_key_handlers.get(entry);
                                if (event_handler) {
                                    event_handler.handle(message);
                                }
                            }
                        }
                    }, consumer);
                    this._logger.info('Queue consumer ' + queue.name + ' successfully created! ');
                }
                catch (err) {
                    return Promise.reject(err);
                }
            }
            return Promise.resolve();
        });
    }
    regExpr(pattern, expression) {
        try {
            pattern = pattern.replace(/(\*)/g, '[a-zA-Z0-9_]*');
            pattern = pattern.replace(/(\.\#)/g, '.*');
            pattern = pattern.replace(/(\#)/g, '.*');
            const regex = new RegExp(pattern);
            return regex.test(expression);
        }
        catch (e) {
            throw e;
        }
    }
};
MessageReceiverRabbitmq = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(identifier_1.Identifier.CUSTOM_LOGGER)),
    __metadata("design:paramtypes", [Object])
], MessageReceiverRabbitmq);
exports.MessageReceiverRabbitmq = MessageReceiverRabbitmq;
