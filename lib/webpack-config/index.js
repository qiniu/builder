/**
 * @file webpack config
 * @author nighca <nighca@live.cn>
 */

const logger = require('../utils/logger')
const buildEnv = require('../utils/build-env')

const getProdConfig = require('./prod')
const getDevConfig = require('./dev')
const getTestConfig = require('./test')

function getConfig(...args) {
  switch (buildEnv.get()) {
    case buildEnv.prod:
      return getProdConfig(...args)
    case buildEnv.test:
      return getTestConfig(...args)
    default:
      return getDevConfig(...args)
  }
}

module.exports = function(...args) {
  return getConfig(...args).then(
    webpackConfig => {
      logger.debug('webpack config:')
      logger.debug(webpackConfig)
      logger.debug('webpack rules:')
      logger.debug(webpackConfig.module.rules)
      return webpackConfig
    }
  )

}
