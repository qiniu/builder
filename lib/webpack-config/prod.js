/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

const findBuildConfig = require('../utils/build-conf').find
const getCommonConfig = require('./common')

module.exports = () => Promise.all([
  getCommonConfig(),
  findBuildConfig()
]).then(
  ([config, buildConfig]) => {
    config = require('./addons/minimize')(config)
    config = require('./addons/extract-style')(config)
    config = require('./addons/use-chunkhash')(config)
    config = require('./addons/use-cdn')(config, buildConfig.publicUrl)
    config = require('./addons/isomorphic-tools')(config, buildConfig.isomorphicTools)
    return config
  }
)

