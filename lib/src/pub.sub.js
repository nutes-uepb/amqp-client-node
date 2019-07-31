"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("./application/connection");
const identifier_1 = require("./di/identifier");
const di_1 = require("./di/di");
class PubSub {
    constructor() {
        this._logger = di_1.DI.get(identifier_1.Identifier.CUSTOM_LOGGER);
    }
    logger(level) {
        this._logger.changeLoggerConfiguration(level);
    }
    createConnetion(params, options) {
        return new connection_1.Connection(params, options).open();
    }
}
exports.pubSub = new PubSub();
