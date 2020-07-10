/**
 * @file polyfill type
 * @author Surmon <i@surmon.me>
 */

exports.PolyfillType = {
  default: 'default',
  runtime: 'runtime'
}

exports.isDefaultPolyfill = type => type === exports.PolyfillType.default
exports.isRuntimePolyfill = type => type === exports.PolyfillType.runtime
