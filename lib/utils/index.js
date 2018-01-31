/*
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

    let result

    try {
      result = method(...args)
    } catch (e) {
      logger.error(`${name} failed`)
      throw e
    }

    if (!result.then) {
      logger.info(`${name} succeeded`)
    } else {
      result.then(
        () => logger.info(`${name} succeeded`),
        () => logger.error(`${name} failed`)
      )
    }

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
 * @desc check isImage by testRegexp
 * @param {RegExp} testRegExp
 * @return {boolean}
 */
function isImage(testRegExp) {
  const matched = type => testRegExp.test(type)
  return ['.png', '.jpg', '.jpeg', '.gif', '.svg'].some(matched)
}

module.exports = {
  extend,
  logLifecycle,
  getPathFromUrl,
  isImage
}
