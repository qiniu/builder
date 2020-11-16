"use strict";
/**
 * @file logger
 * @author nighca <nighca@live.cn>
 */
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = require("log4js");
const logger = log4js_1.getLogger('FEC');
logger.level = process.env.verbose ? 'debug' : 'info';
exports.default = logger;
