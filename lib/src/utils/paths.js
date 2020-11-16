"use strict";
/**
 * @file paths
 * @author nighca <nighca@live.cn>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestDistPath = exports.getDistPath = exports.getStaticPath = exports.getSrcPath = exports.setIsomorphicToolsFilePath = exports.getIsomorphicToolsFilePath = exports.setEnvVariablesFilePath = exports.getEnvVariablesFilePath = exports.setBuildConfigFilePath = exports.getBuildConfigFilePath = exports.abs = exports.setBuildRoot = exports.getBuildRoot = void 0;
const path_1 = require("path");
const logger_1 = require("./logger");
let buildRoot = process.env.BUILD_ROOT || process.cwd();
function getBuildRoot() {
    return buildRoot;
}
exports.getBuildRoot = getBuildRoot;
function setBuildRoot(target) {
    const resolved = path_1.default.resolve(target);
    logger_1.default.debug(`set build root: ${target} (${resolved})`);
    buildRoot = resolved;
}
exports.setBuildRoot = setBuildRoot;
/** get absolute path with given path relative to build root */
function abs(p) {
    return path_1.default.resolve(buildRoot, p);
}
exports.abs = abs;
let buildConfigFilePath = process.env.BUILD_CONFIG_FILE || null;
let envVariablesFilePath = process.env.ENV_VARIABLES_FILE || null;
let isomorphicToolsFilePath = process.env.ISOMORPHIC_TOOLS_FILE || null;
/** get build config file path */
function getBuildConfigFilePath() {
    return buildConfigFilePath;
}
exports.getBuildConfigFilePath = getBuildConfigFilePath;
/** set build config file path */
function setBuildConfigFilePath(target) {
    buildConfigFilePath = path_1.default.resolve(target);
}
exports.setBuildConfigFilePath = setBuildConfigFilePath;
/** get env variables file path */
function getEnvVariablesFilePath() {
    return envVariablesFilePath;
}
exports.getEnvVariablesFilePath = getEnvVariablesFilePath;
/** set env variables file path */
function setEnvVariablesFilePath(target) {
    envVariablesFilePath = path_1.default.resolve(target);
}
exports.setEnvVariablesFilePath = setEnvVariablesFilePath;
/** get ssr isomorphic-tools.js file path */
function getIsomorphicToolsFilePath() {
    return isomorphicToolsFilePath;
}
exports.getIsomorphicToolsFilePath = getIsomorphicToolsFilePath;
/** set ssr isomorphic-tools.js file path */
function setIsomorphicToolsFilePath(target) {
    isomorphicToolsFilePath = path_1.default.resolve(target);
}
exports.setIsomorphicToolsFilePath = setIsomorphicToolsFilePath;
/** get src path */
function getSrcPath(conf) {
    return abs(conf.srcDir);
}
exports.getSrcPath = getSrcPath;
/** get static path */
function getStaticPath(conf) {
    return abs(conf.staticDir);
}
exports.getStaticPath = getStaticPath;
/** get dist path */
function getDistPath(conf) {
    return abs(conf.distDir);
}
exports.getDistPath = getDistPath;
/** get test dist path */
function getTestDistPath(conf) {
    return path_1.default.join(getDistPath(conf), '.test');
}
exports.getTestDistPath = getTestDistPath;
