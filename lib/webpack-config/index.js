/*
 * @file webpack config
 * @author nighca <nighca@live.cn>
 */

const logger = require('../utils/logger')
const buildEnv = require('../utils/build-env')

const getProdConfig = require('./prod')
const getDevConfig = require('./dev')

module.exports = function() {

  const webpackConfigPromise = (
    buildEnv.get() === 'production'
    ? getProdConfig()
    : getDevConfig()
  )

  return webpackConfigPromise.then(
    webpackConfig => {
      logger.debug('rules:')
      webpackConfig.module.rules.forEach(
        rule => {
          Object.keys(rule).forEach(
            key => {
              logger.debug(`${key}:`, rule[key])
            }
          )
        }
      )
      // logger.debug(webpackConfig.module.rules)
      return webpackConfig
    }
  )

}
