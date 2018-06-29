/*
 * @file builder
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')
const webpackDevServer = require('webpack-dev-server')

const utils = require('../utils')
const logger = require('../utils/logger')
const buildEnv = require('../utils/build-env')
const findBuildConfig = require('../utils/build-conf').find
const paths = require('../utils/paths')
const nodeModulesOfBuilder = path.resolve(__dirname, '../../node_modules')
const dirnameOfBuilder = path.resolve(__dirname, '../../..')

module.exports = () => findBuildConfig().then(
  buildConfig => {
    const env = buildEnv.get()

    const projectPaths = {
      root: paths.getBuildRoot(buildConfig),
      src: paths.getSrcPath(buildConfig),
      dist: paths.getDistPath(buildConfig),
      dep: paths.abs('node_modules')
    }

    // original webpack config
    let webpackConfig = {

      context: projectPaths.root,

      entry: {},

      resolve: {
        extensions: ['.js'],
        modules: [
          projectPaths.src,
          projectPaths.dep,
          nodeModulesOfBuilder,
          dirnameOfBuilder,
          'node_modules'
        ]
      },

      resolveLoader: {
        modules: [
          nodeModulesOfBuilder,
          dirnameOfBuilder,
          'node_modules'
        ]
      },

      externals: [],

      module: {
        rules: []
      },
      plugins: [],

      output: {},

      devServer: {
        historyApiFallback: {
          rewrites: [
          ]
        }
      }
    }

    // add transforms
    Object.keys(buildConfig.transforms).forEach(key => {
      webpackConfig = require('./addons/add-transform')(
        webpackConfig,
        key,
        buildConfig.transforms[key],
        buildConfig
      )
    })

    // 有的 transform 的添加逻辑比较特别，需要在别的添加完成后再添加，使用最后一个参数 post 标识
    Object.keys(buildConfig.transforms).forEach(key => {
      webpackConfig = require('./addons/add-transform')(
        webpackConfig,
        key,
        buildConfig.transforms[key],
        buildConfig,
        true
      )
    })

    // define env
    webpackConfig = require('./addons/define-env')(webpackConfig, env, buildConfig.envVariables)

    return webpackConfig
  }
)
