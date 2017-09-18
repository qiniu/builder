/*
 * @file util methods
 * @author nighca <nighca@live.cn>
 */

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

module.exports = {
  extend,
  logLifecycle
}
