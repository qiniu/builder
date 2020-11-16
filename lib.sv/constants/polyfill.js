/**
 * @file polyfill type
 * @author Surmon <i@surmon.me>
 */

exports.polyfillType = {
  global: 'global',
  runtime: 'runtime'
}

// 是否 polyfill 尚在提案阶段的 API
exports.proposalsEnabled = false

exports.isGlobalPolyfill = type => {
  return type === exports.polyfillType.global || type === true
}

exports.isRuntimePolyfill = type => {
  return type === exports.polyfillType.runtime
}
