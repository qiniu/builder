"use strict";
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
exports.findBuildConfig = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const files_1 = require("../constants/files");
const _1 = require(".");
const paths_1 = require("./paths");
const logger_1 = require("./logger");
/** merge two config content */
function mergeConfig(cfg1, cfg2) {
    return _1.extend({}, cfg1, cfg2, {
        optimization: _1.extend({}, cfg1.optimization, cfg2.optimization),
        transforms: _1.extend({}, cfg1.transforms, cfg2.transforms),
        deploy: _1.extend({}, cfg1.deploy, cfg2.deploy),
        test: _1.extend({}, cfg1.test, cfg2.test)
    });
}
/** parse config content */
const parseConfig = (cnt) => JSON.parse(cnt);
/** read and parse config content */
const readConfig = (configFilePath) => {
    const configFileRawContent = fs_1.default.readFileSync(configFilePath, { encoding: 'utf8' });
    const configFileContent = parseConfig(configFileRawContent);
    return configFileContent;
};
const parseEnvVariables = (cnt) => JSON.parse(cnt);
const readEnvVariables = (envVariablesFilePath) => {
    const envVariablesFileRawContent = fs_1.default.readFileSync(envVariablesFilePath, { encoding: 'utf8' });
    const envVariablesFileContent = parseEnvVariables(envVariablesFileRawContent);
    return envVariablesFileContent;
};
/** lookup extends target */
function lookupExtendsTarget(
/** name of extends target */
name, 
/** path of source config file */
sourceConfigFilePath) {
    logger_1.default.debug(`lookup extends target config: ${name}`);
    const presetConfigFilePath = path_1.default.resolve(__dirname, `../../preset-configs/${name}.json`);
    logger_1.default.debug(`try preset config: ${presetConfigFilePath}`);
    if (fs_1.default.existsSync(presetConfigFilePath)) {
        logger_1.default.debug(`found preset config: ${presetConfigFilePath}`);
        return Promise.resolve(presetConfigFilePath);
    }
    const sourceConfigFileDir = path_1.default.dirname(sourceConfigFilePath);
    const localConfigFilePath = path_1.default.resolve(sourceConfigFileDir, name);
    logger_1.default.debug(`try local config: ${localConfigFilePath}`);
    if (fs_1.default.existsSync(localConfigFilePath)) {
        logger_1.default.debug(`found local config: ${localConfigFilePath}`);
        return Promise.resolve(localConfigFilePath);
    }
    const localConfigFilePathWithExtension = path_1.default.resolve(sourceConfigFileDir, `${name}.json`);
    logger_1.default.debug(`try local config with extension: ${localConfigFilePathWithExtension}`);
    if (fs_1.default.existsSync(localConfigFilePathWithExtension)) {
        logger_1.default.debug(`found local config with extension: ${localConfigFilePathWithExtension}`);
        return Promise.resolve(localConfigFilePathWithExtension);
    }
    // TODO: 支持以 npm 包的方式发布 config
    // 即，这里查找 preset config & local config 失败后，再去尝试 npm package
    const message = `lookup extends target config failed: ${name}`;
    logger_1.default.debug(message);
    return Promise.reject(new Error(message));
}
/** get extends target content */
function getExtendsTarget(
/** name of extends target */
name, 
/** path of source config file */
sourceConfigFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const configFilePath = yield lookupExtendsTarget(name, sourceConfigFilePath);
        return readAndResolveConfig(configFilePath);
    });
}
/** resolve config content by recursively get and merge config to `extends` */
function readAndResolveConfig(
/** path of given config */
configFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = readConfig(configFilePath);
        const extendsTarget = config.hasOwnProperty('extends') ? config['extends'] : 'default';
        if (!extendsTarget) {
            return Promise.resolve(config);
        }
        const extendsConfig = yield getExtendsTarget(extendsTarget, configFilePath);
        return mergeConfig(extendsConfig, config);
    });
}
let cached = null;
/** find config file and resolve config content based on paths info */
function findBuildConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        if (cached) {
            return cached;
        }
        // 若指定了 build config file path，则使用之
        // 否则使用 build root 下的 build config 文件
        const configFilePath = paths_1.getBuildConfigFilePath() || paths_1.abs(files_1.default.config);
        logger_1.default.debug(`use build config file: ${configFilePath}`);
        return cached = readAndResolveConfig(configFilePath).then(config => {
            // 若指定了 env variables file path
            // 读取之并覆盖 build config 中的 envVariables 字段
            const envVariablesFilePath = paths_1.getEnvVariablesFilePath();
            if (envVariablesFilePath) {
                logger_1.default.debug(`use env variables file: ${envVariablesFilePath}`);
                const envVariables = readEnvVariables(envVariablesFilePath);
                config.envVariables = envVariables;
            }
            const isomorphicToolsFilePath = paths_1.getIsomorphicToolsFilePath();
            if (isomorphicToolsFilePath) {
                logger_1.default.debug(`use isomorphic-tools file: ${isomorphicToolsFilePath}`);
                config.isomorphicTools = require(isomorphicToolsFilePath);
            }
            logger_1.default.debug('result build config:');
            logger_1.default.debug(config);
            return config;
        });
    });
}
exports.findBuildConfig = findBuildConfig;
