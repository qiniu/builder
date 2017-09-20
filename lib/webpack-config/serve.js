/*
 * @file webpack config for serve
 * @author nighca <nighca@live.cn>
 */

const findBuildConf = require('../utils/build-conf').find
const getDevConfig = require('./dev')

module.exports = () => Promise.all([
  getDevConfig(),
  findBuildConf()
]).then(
  ([webpackConfig, buildConfig]) => {
    webpackConfig = require('./addons/hot-dev')(webpackConfig)
    webpackConfig = require('./addons/configure-proxy')(webpackConfig, buildConfig.devProxy)
    return webpackConfig
  }
)
