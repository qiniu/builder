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
      logger.debug('webpack config:')
      logger.debug(webpackConfig)
      logger.debug('webpack rules:')
      logger.debug(webpackConfig.module.rules)
      return webpackConfig
    }
  )

}
