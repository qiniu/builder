"use strict";
/**
 * @file util methods
 * @author nighca <nighca@live.cn>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSnapshotGlob = exports.makeTestGlob = exports.makeTestRegexpText = exports.removeSuffix = exports.isImage = exports.getPathFromUrl = exports.logLifecycle = exports.extend = void 0;
const url_1 = require("url");
function extend(target, ...addons) {
    addons.forEach(addon => {
        for (let key in addon) {
            if (addon.hasOwnProperty(key)) {
                target[key] = addon[key];
            }
        }
    });
    return target;
}
exports.extend = extend;
const durationHumanizeSteps = [
    { unit: 'day', amount: 1000 * 60 * 60 * 24 },
    { unit: 'hour', amount: 1000 * 60 * 60 },
    { unit: 'min', amount: 1000 * 60 },
    { unit: 's', amount: 1000 },
    { unit: 'ms', amount: 1 }
];
function getDurationFrom(startAt) {
    const duration = Date.now() - startAt;
    if (duration < 1) {
        return '0ms';
    }
    const result = durationHumanizeSteps.reduce(([parts, duration], { unit, amount }) => {
        if (duration >= amount) {
            parts.push(`${Math.floor(duration / amount)}${unit}`);
            duration = duration % amount;
        }
        return [parts, duration];
    }, [[], duration]);
    return result[0].join(' ');
}
function getMessage(e) {
    if (!e)
        return null;
    if (e.message)
        return e.message;
    return e + '';
}
/** log behavior lifecycle */
function logLifecycle(
/** behavior name */
name, 
/** target method */
method, logger) {
    return (...args) => {
        logger.info(`${name} start`);
        const startAt = Date.now();
        const result = new Promise(resolve => resolve(method(...args)));
        result.then(() => logger.info(`${name} succeeded, costs: ${getDurationFrom(startAt)}`), err => {
            const message = getMessage(err);
            logger.error(message
                ? `${name} failed: ${message}`
                : `${name} failed.`);
        });
        return result;
    };
}
exports.logLifecycle = logLifecycle;
/** get prefix part from url */
function getPathFromUrl(targetUrl, 
/** if with slash at begining & ending */
withSlash = true) {
    const parsed = url_1.default.parse(targetUrl);
    const pathWithoutSlash = (parsed.pathname || '').replace(/^\/|\/$/g, '');
    return (withSlash
        ? (pathWithoutSlash ? `/${pathWithoutSlash}/` : '/')
        : pathWithoutSlash);
}
exports.getPathFromUrl = getPathFromUrl;
/** check isImage by extension */
function isImage(extension) {
    // svg 有可能是字体文件，且 svg 作为图片时本身压缩空间小，暂不做处理
    return ['png', 'jpg', 'jpeg', 'gif'].some(type => type === extension);
}
exports.isImage = isImage;
/** remove suffix in filePath */
function removeSuffix(filePath) {
    return filePath.replace(/\.\w+$/, '');
}
exports.removeSuffix = removeSuffix;
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
/** make regexp test for test files */
function makeTestRegexpText(extensions) {
    return `\\.spec\\.(${extensions.map(escapeRegExp).join('|')})$`;
}
exports.makeTestRegexpText = makeTestRegexpText;
/** make glob for test files (under build root) */
function makeTestGlob(srcDir, extensions) {
    if (extensions.length === 0) {
        throw new Error('at least one extension required');
    }
    if (extensions.length === 1) {
        const extension = extensions[0];
        return `${srcDir}/**/*.spec.${extension}`;
    }
    const extensionsText = extensions.join('|');
    return `${srcDir}/**/*.spec.@(${extensionsText})`;
}
exports.makeTestGlob = makeTestGlob;
/** make glob for snapshot glob (under build root) */
function makeSnapshotGlob(srcDir) {
    return `${srcDir}/**/*.snap`;
}
exports.makeSnapshotGlob = makeSnapshotGlob;
// TODO
// export function getDefaultExtensions(webpackConfig) {
//   return webpackConfig.resolve.extensions.map(
//     extension => extension.replace(/^\./, '')
//   )
// }
// TODO
// function runWebpackCompiler(compiler) {
//   return new Promise((resolve, reject) => {
//     compiler.run((err, stats) => {
//       if (err || stats.hasErrors()) {
//         reject(err || stats.toJson().errors)
//         return
//       }
//       resolve(stats)
//     })
//   })
// }
