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
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const inversify_1 = require("inversify");
let CustomLogger = class CustomLogger {
    constructor() {
        this._options = {};
        this.initOptions();
        this._logger = this.internalCreateLogger();
    }
    get logger() {
        return this._logger;
    }
    internalCreateLogger() {
        return winston_1.createLogger({
            level: 'silly',
            silent: false,
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
            transports: new winston_1.transports.Console(this._options),
            exitOnError: false
        });
    }
    initOptions() {
        this._options = {
            level: 'error',
            silent: true,
            handleExceptions: true,
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.splat(), winston_1.format.timestamp(), winston_1.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`))
        };
    }
    addTransport(transport) {
        return this._logger.add(transport);
    }
    error(message) {
        this._logger.error(message);
    }
    warn(message) {
        this._logger.warn(message);
    }
    info(message) {
        this._logger.info(message);
    }
    verbose(message) {
        this._logger.verbose(message);
    }
    debug(message) {
        this._logger.debug(message);
    }
    silly(message) {
        this._logger.silly(message);
    }
    changeLoggerConfiguration(enabled, level) {
        this._options.silent = !enabled;
        if (level)
            this._options.level = level;
        this._logger.clear();
        this._logger.add(new winston_1.transports.Console(this._options));
        return;
    }
};
CustomLogger = __decorate([
    inversify_1.injectable(),
    __metadata("design:paramtypes", [])
], CustomLogger);
exports.CustomLogger = CustomLogger;
