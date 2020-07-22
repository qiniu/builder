/**
 * @file polyfill type
 * @author Surmon <i@surmon.me>
 */

exports.polyfillType = {
  global: 'global',
  runtime: 'runtime'
}

exports.isGlobalPolyfill = type => {
  return type === exports.polyfillType.global || type === true
}
exports.isRuntimePolyfill = type => {
  return type === exports.polyfillType.runtime
}
