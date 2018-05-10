/*
 * @file common webpack config for testing (maybe for later coverage build)
 * @author nighca <nighca@live.cn>
 */

const path = require('path')

const utils = require('../utils')
const paths = require('../utils/paths')
const buildEnv = require('../utils/build-env')
const findBuildConfig = require('../utils/build-conf').find
const getCommonConfig = require('./common')

module.exports = () => Promise.all([
  findBuildConfig(),
  getCommonConfig()
]).then(
  ([buildConfig, webpackConfig]) => {
    const env = buildEnv.get()

    const projectPaths = {
      root: paths.getBuildRoot(),
      src: paths.getSrcPath(buildConfig),
      dist: paths.getDistPath(buildConfig),
      test: paths.getTestDistPath(buildConfig),
      dep: paths.abs('node_modules')
    }

    webpackConfig = utils.extend({}, webpackConfig, {

      target: 'node',

      output: {
        path: projectPaths.test,
        filename: '[name]'
      },

      devtool: 'inline-source-map'

    })

    return webpackConfig
  }
)
