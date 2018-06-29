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
    config = require('./addons/minimize')(config)
    config = require('./addons/extract-style')(config)
    config = require('./addons/use-chunkhash')(config)
    config = require('./addons/isomorphic-tools')(config, buildConfig.isomorphicTools)
    config = require('./addons/common-chunks')(config, buildConfig.optimization)
    config = require('./addons/compress-image')(config, buildConfig.optimization)    
    return config
  }
)

