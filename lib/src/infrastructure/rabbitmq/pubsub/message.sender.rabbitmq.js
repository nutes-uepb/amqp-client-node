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
const message_1 = require("../bus/message");
const inversify_1 = require("inversify");
const identifier_1 = require("../../../di/identifier");
let MessageSenderRabbitmq = class MessageSenderRabbitmq {
    constructor(_logger) {
        this._logger = _logger;
    }
    set connection(value) {
        this._connection = value;
    }
    sendRoutingKeyMessage(exchangeName, topicKey, message, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._connection && !this._connection.isConnected) {
                    return Promise.reject(new Error('Connection Failed'));
                }
                let exchangeOptions;
                if (options)
                    exchangeOptions = options.exchange;
                const msg = yield this.createMessage(message);
                const exchange = this._connection.getExchange(exchangeName, exchangeOptions);
                yield exchange.initialized;
                exchange.send(msg, topicKey);
                this._logger.info('Bus event message sent with success!');
                return Promise.resolve();
            }
            catch (err) {
                return Promise.reject(err);
            }
        });
    }
    createMessage(message, eventName) {
        try {
            if (!this._connection.idConnection)
                this._connection.idConnection = 'id-' + Math.random().toString(36).substr(2, 16);
            const rabbitMessage = new message_1.Message(message.content, message.properties);
            rabbitMessage.properties = Object.assign({}, message.properties, { correlationId: this._connection.idConnection, messageId: message.properties.message_id, userId: message.properties.user_id, appId: message.properties.app_id, clusterId: message.properties.cluster_id });
            return Promise.resolve(rabbitMessage);
        }
        catch (err) {
            return Promise.reject(err);
        }
    }
};
MessageSenderRabbitmq = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(identifier_1.Identifier.CUSTOM_LOGGER)),
    __metadata("design:paramtypes", [Object])
], MessageSenderRabbitmq);
exports.MessageSenderRabbitmq = MessageSenderRabbitmq;
