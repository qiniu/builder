/**
 * @file util methods
 * @author nighca <nighca@live.cn>
 */

const url = require('url')

function extend(target, ...addons) {
  addons.forEach(addon => {
    for (let key in addon) {
      if (addon.hasOwnProperty(key)) {
        target[key] = addon[key]
      }
    }
  })
  return target
}

const durationHumanizeSteps = [
  { unit: 'day', amount: 1000 * 60 * 60 * 24 },
  { unit: 'hour', amount: 1000 * 60 * 60 },
  { unit: 'min', amount: 1000 * 60 },
  { unit: 's', amount: 1000 },
  { unit: 'ms', amount: 1 }
]

function getDurationFrom(startAt) {
  const duration = Date.now() - startAt
  if (duration < 1) {
    return '0ms'
  }
  const result = durationHumanizeSteps.reduce(([parts, duration], { unit, amount }) => {
    if (duration >= amount) {
      parts.push(`${Math.floor(duration / amount)}${unit}`)
      duration = duration % amount
    }
    return [parts, duration]
  }, [[], duration])
  return result[0].join(' ')
}

function getMessage(e) {
  if (!e) return null
  if (e.message) return e.message
  return e + ''
}

/**
 * @desc log behavior lifecycle
 * @param  {string} name - behavior name
 * @param  {Function} method - target method
 * @param  {object} logger - logger
 * @return {Function}
 */
function logLifecycle(name, method, logger) {
  return (...args) => {
    logger.info(`${name} start`)
    const startAt = Date.now()
    const result = new Promise(resolve => resolve(method(...args)))
    result.then(
      () => logger.info(`${name} succeeded, costs: ${getDurationFrom(startAt)}`),
      err => {
        const message = getMessage(err)
        logger.error(
          message
          ? `${name} failed: ${message}`
          : `${name} failed.`
        )
      }
    )
    return result
  }
}

/**
 * @desc get prefix part from url
 * @param  {string} targetUrl - target url
 * @param  {boolean} withSlash - if with slash at begining & ending
 * @return {string}
 */
function getPathFromUrl(targetUrl, withSlash = true) {
  const parsed = url.parse(targetUrl)
  const pathWithoutSlash = parsed.pathname.replace(/^\/|\/$/g, '')
  return (
    withSlash
    ? (pathWithoutSlash ? `/${pathWithoutSlash}/` : '/')
    : pathWithoutSlash
  )
}

/**
 * @desc check isImage by extension
 * @param {string} extension
 * @return {boolean}
 */
function isImage(extension) {
  const matched = type => type === extension
  // svg 有可能是字体文件，且 svg 作为图片时本身压缩空间小，暂不做处理
  return ['png', 'jpg', 'jpeg', 'gif'].some(matched)
}

/**
 * @desc remove suffix in filePath
 * @param {string} filePath
 * @return {string}
 */
function removeSuffix(filePath) {
  return filePath.replace(/\.\w+$/, '')
}

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/**
 * @desc make regexp test for test files
 * @param {string[]} extensions
 * @return {string}
 */
function makeTestRegexpText(extensions) {
  return `\\.spec\\.(${extensions.map(escapeRegExp).join('|')})$`
}

/**
 * @desc make glob for test files (under build root)
 * @param {string} srcDir
 * @param {string[]} extensions
 * @return {string}
 */
function makeTestGlob(srcDir, extensions) {
  if (extensions.length === 0) {
    throw new Error('at least one extension required')
  }
  if (extensions.length === 1) {
    const extension = extensions[0]
    return `${srcDir}/**/*.spec.${extension}`
  }
  const extensionsText = extensions.join('|')
  return `${srcDir}/**/*.spec.@(${extensionsText})`
}

/**
 * @desc make glob for snapshot glob (under build root)
 * @param {string} srcDir
 * @return {string}
 */
function makeSnapshotGlob(srcDir) {
  return `${srcDir}/**/*.snap`
}

function getDefaultExtensions(webpackConfig) {
  return webpackConfig.resolve.extensions.map(
    extension => extension.replace(/^\./, '')
  )
}

function runWebpackCompiler(compiler) {
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err || stats.toJson().errors)
        return
      }
      resolve(stats)
    })
  })
}

module.exports = {
  extend,
  logLifecycle,
  getPathFromUrl,
  isImage,
  removeSuffix,
  makeTestRegexpText,
  makeTestGlob,
  makeSnapshotGlob,
  getDefaultExtensions,
  runWebpackCompiler
}
