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
const communications_options_interface_1 = require("../../../application/port/communications.options.interface");
let ClientRegisterRabbitmq = class ClientRegisterRabbitmq {
    constructor(_logger) {
        this._logger = _logger;
    }
    set connection(value) {
        this._connection = value;
    }
    registerRoutingKeyClient(exchangeName, resource, options = communications_options_interface_1.defClientOptions) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._connection && !this._connection.isConnected) {
                    return reject(new Error('Connection Failed'));
                }
                const exchange = this._connection.getExchange(exchangeName, options.exchange);
                let time;
                const timeout = options.rcp_timeout;
                if (timeout > 0) {
                    new Promise((res) => {
                        time = setTimeout(res, timeout);
                    }).then(() => {
                        reject(new Error('rpc timed out'));
                    });
                }
                exchange.rpc(resource, resource.resource_name, (err, msg) => {
                    clearTimeout(time);
                    if (err)
                        return reject(err);
                    const message = this.createMessage(msg);
                    return resolve(message);
                });
                this._logger.info('Client registered in ' + exchangeName + ' exchange!');
            }
            catch (err) {
                return reject(err);
            }
        }));
    }
    createMessage(message) {
        return {
            properties: {
                priority: message.properties.priority,
                expiration: message.properties.expiration,
                message_id: message.properties.messageId,
                timestamp: message.properties.timestamp,
                user_id: message.properties.userId,
                app_id: message.properties.appId,
                cluster_id: message.properties.clusterId,
                cc: message.properties.cc,
                bcc: message.properties.bcc
            },
            content: message.getContent(),
            fields: {
                consumer_tag: message.fields.consumerTag,
                delivery_tag: message.fields.deliveryTag,
                redelivered: message.fields,
                exchange: message.fields.exchange,
                routing_key: message.fields.routingKey
            }
        };
    }
};
ClientRegisterRabbitmq = __decorate([
    inversify_1.injectable(),
    __param(0, inversify_1.inject(identifier_1.Identifier.CUSTOM_LOGGER)),
    __metadata("design:paramtypes", [Object])
], ClientRegisterRabbitmq);
exports.ClientRegisterRabbitmq = ClientRegisterRabbitmq;
