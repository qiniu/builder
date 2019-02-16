/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

const findBuildConfig = require('../utils/build-conf').find
const getBuildCommonConfig = require('./build-common')

module.exports = () => Promise.all([
  getBuildCommonConfig(),
  findBuildConfig()
]).then(
  ([config, buildConfig]) => {
    config.mode = 'production'
    // webpack 4 在‘production’mode下，默认带有uglify-webpack-plugin
    config = require('./addons/extract-style')(config)
    config = require('./addons/use-chunkhash')(config)
    config = require('./addons/isomorphic-tools')(config, buildConfig.isomorphicTools)
    config = require('./addons/common-chunks')(config)
    config = require('./addons/compress-image')(config, buildConfig.optimization)
    return config
  }
)

