"use strict";
/**
 * @file prepare behaviors
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
const semver_1 = require("semver");
const logger_1 = require("./utils/logger");
const build_conf_1 = require("./utils/build-conf");
const package_json_1 = require("../package.json");
function prepare() {
    return __awaiter(this, void 0, void 0, function* () {
        const buildConfig = yield build_conf_1.findBuildConfig();
        const builderVersionRange = buildConfig.engines && buildConfig.engines.builder;
        if (typeof builderVersionRange === 'string') {
            const builderVersion = package_json_1.default.version;
            if (!semver_1.default.satisfies(builderVersion, builderVersionRange)) {
                logger_1.default.warn(`builder version not satisfied, which may causes error (expected \`${builderVersionRange}\`, got \`${builderVersion}\`)`);
            }
        }
    });
}
exports.default = prepare;
