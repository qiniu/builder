"use strict";
/**
 * @file env info
 * @author nighca <nighca@live.cn>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEnv = exports.getEnv = exports.Env = void 0;
var Env;
(function (Env) {
    Env["Test"] = "test";
    Env["Dev"] = "development";
    Env["Prod"] = "production";
})(Env = exports.Env || (exports.Env = {}));
let env = process.env.BUILD_ENV;
/** Get build env */
function getEnv() {
    return env;
}
exports.getEnv = getEnv;
function setEnv(target) {
    env = process.env.NODE_ENV = target;
}
exports.setEnv = setEnv;
