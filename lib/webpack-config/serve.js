/*
 * @file webpack config for serve
 * @author nighca <nighca@live.cn>
 */

module.exports = Promise.all([
  require('./dev'),
  require('../conf')
]).then(
  ([webpackConfig, projectConfig]) => {
    webpackConfig = require('./addons/hot-dev')(webpackConfig)
    webpackConfig = require('./addons/configure-proxy')(webpackConfig, projectConfig.devProxy)
    return webpackConfig
  }
)
