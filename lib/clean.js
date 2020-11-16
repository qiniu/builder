"use strict";
/**
 * @file clean dist
 * @author nighca <nighca@live.cn>
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const del = require("del");
const paths_1 = require("./utils/paths");
const logger_1 = require("./utils/logger");
const utils_1 = require("./utils");
const build_conf_1 = require("./utils/build-conf");
function clean() {
    return __awaiter(this, void 0, void 0, function* () {
        const buildConfig = yield build_conf_1.findBuildConfig();
        const dist = paths_1.getDistPath(buildConfig);
        logger_1.default.debug(`clean dist: ${dist}`);
        yield del(dist, { force: true });
    });
}
exports.default = utils_1.logLifecycle('Clean', clean, logger_1.default);
