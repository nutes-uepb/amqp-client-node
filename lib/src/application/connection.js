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
const server_register_rabbitmq_1 = require("../infrastructure/rabbitmq/rpc/server.register.rabbitmq");
const identifier_1 = require("../di/identifier");
const di_1 = require("../di/di");
class Connection {
    constructor(parameters, options) {
        this._eventBusConnection = di_1.DI.get(identifier_1.Identifier.RABBITMQ_CONNECTION);
        this._eventBusConnection.configurations = parameters;
        this._eventBusConnection.options = options;
        this._pub = di_1.DI.get(identifier_1.Identifier.RABBITMQ_MENSSAGE_SENDER);
        this._sub = di_1.DI.get(identifier_1.Identifier.RABBITMQ_MENSSAGE_RECEIVER);
        this._rpcClient = di_1.DI.get(identifier_1.Identifier.RABBITMQ_CLIENT_REGISTER);
    }
    get isOpen() {
        return this._eventBusConnection.isConnected;
    }
    open() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (this._eventBusConnection && this._eventBusConnection.isConnected)
                return resolve(this);
            this._eventBusConnection
                .connect()
                .then(() => {
                this._pub.connection = this._eventBusConnection;
                this._sub.connection = this._eventBusConnection;
                this._rpcClient.connection = this._eventBusConnection;
                return resolve(this);
            })
                .catch(reject);
        }));
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._eventBusConnection.closeConnection();
        });
    }
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._eventBusConnection.disposeConnection();
        });
    }
    on(event, listener) {
        this._eventBusConnection.on(event, listener);
    }
    pub(exchangeName, routingKey, message, options) {
        return this._pub.sendRoutingKeyMessage(exchangeName, routingKey, message, options);
    }
    sub(queueName, exchangeName, routingKey, callback, options) {
        const eventCallback = {
            handle: callback
        };
        this._sub
            .receiveRoutingKeyMessage(queueName, exchangeName, routingKey, eventCallback, options)
            .catch(err => {
            callback(err, undefined);
        });
    }
    createRpcServer(queueName, exchangeName, routingKey, options) {
        return new server_register_rabbitmq_1.ServerRegisterRabbitmq(this._eventBusConnection, queueName, exchangeName, routingKey, options);
    }
    rpcClient(exchangeName, resourceName, parameters, optOrCall, options) {
        if (!(optOrCall instanceof Function)) {
            return this.rpcClientPromise(exchangeName, resourceName, parameters, options);
        }
        this.rpcClientCallback(exchangeName, resourceName, parameters, optOrCall, options);
    }
    rpcClientCallback(exchangeName, resourceName, parameters, callback, options) {
        const clientRequest = {
            resource_name: resourceName,
            handle: parameters
        };
        this._rpcClient
            .registerRoutingKeyClient(exchangeName, clientRequest, options)
            .then((result) => {
            callback(undefined, result);
        })
            .catch(err => {
            callback(err, undefined);
        });
    }
    rpcClientPromise(exchangeName, resourceName, parameters, options) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const clientRequest = {
                resource_name: resourceName,
                handle: parameters
            };
            this._rpcClient
                .registerRoutingKeyClient(exchangeName, clientRequest, options)
                .then((result) => {
                return resolve(result);
            })
                .catch(err => {
                return reject(err);
            });
        }));
    }
}
exports.Connection = Connection;
