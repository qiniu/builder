#! /usr/bin/env node
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
const yargs_1 = require("yargs");
const paths = require("./utils/paths");
const build_env_1 = require("./utils/build-env");
const logger_1 = require("./utils/logger");
const prepare_1 = require("./prepare");
const clean_1 = require("./clean");
// import generate from './generate'
// import upload from './upload'
// import serve from './serve'
// import test from './test'
const options = {
    BUILD_ROOT: {
        alias: 'r',
        desc: 'Root path of your project (which contains build-config.json)',
        type: 'string',
        default: process.cwd()
    },
    BUILD_ENV: {
        alias: 'e',
        desc: 'Environment for build, one of [ development, production ]',
        type: 'string',
        default: 'development'
    },
    PORT: {
        alias: 'p',
        desc: 'Port for dev server',
        type: 'number',
        default: 80
    },
    BUILD_CONFIG_FILE: {
        alias: 'c',
        desc: 'Path of build config file. If provided, it will be used superior to build-config.json under BUILD_ROOT',
        type: 'string'
    },
    ENV_VARIABLES_FILE: {
        alias: 'f',
        desc: 'Target file path for env variables',
        type: 'string'
    },
    ISOMORPHIC_TOOLS_FILE: {
        desc: 'Target file path for isomorphic-tools.js for ssr',
        type: 'string'
    },
    verbose: {
        type: 'boolean',
        desc: 'Output more info',
        default: false
    }
};
const commands = {
    clean: {
        desc: 'Clean result file',
        handler: clean_1.default
    },
};
// define options
yargs_1.default.options(options);
Object.keys(commands).forEach(name => {
    const { desc, handler, isDefault } = commands[name];
    const command = isDefault ? [name, '*'] : name;
    yargs_1.default.command(command, desc, () => { }, (args) => __awaiter(void 0, void 0, void 0, function* () {
        applyArgv(args);
        try {
            yield prepare_1.default();
            yield handler(args);
        }
        catch (e) {
            handleError(e);
        }
    }));
});
// enable --version
yargs_1.default.version();
// enable help (-h, --help, help)
yargs_1.default.help('h').alias('h', 'help');
// set locale
yargs_1.default.locale('en');
// run
function applyArgv(argv) {
    if (argv.verbose) {
        logger_1.default.level = 'debug';
    }
    if (argv.BUILD_ROOT) {
        paths.setBuildRoot(argv.BUILD_ROOT);
    }
    if (argv.BUILD_CONFIG_FILE) {
        paths.setBuildConfigFilePath(argv.BUILD_CONFIG_FILE);
    }
    if (argv.ENV_VARIABLES_FILE) {
        paths.setEnvVariablesFilePath(argv.ENV_VARIABLES_FILE);
    }
    if (argv.ISOMORPHIC_TOOLS_FILE) {
        paths.setIsomorphicToolsFilePath(argv.ISOMORPHIC_TOOLS_FILE);
    }
    if (argv.BUILD_ENV) {
        build_env_1.setEnv(argv.BUILD_ENV);
    }
}
function handleError(e) {
    if (Array.isArray(e)) {
        e.forEach(item => logger_1.default.error(item));
    }
    else {
        e && logger_1.default.error(e);
    }
    logger_1.default.fatal('encountered error, exit 1');
    process.exit(1);
}
