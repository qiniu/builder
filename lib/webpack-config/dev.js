/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

const getBuildCommonConfig = require('./build-common')

module.exports = () => getBuildCommonConfig().then(
  config => {
    config.mode = 'development'
    config = require('./addons/fork-ts-checker-webpack-plugin')(config)
    return config
  }
)
