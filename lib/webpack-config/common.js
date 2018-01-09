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
      dist: paths.getDistPath(buildConfig)
    }

    const entries = Object.keys(buildConfig.entries).reduce((entries, name) => {
      entries[name] = path.join(projectPaths.root, buildConfig.entries[name])
      return entries
    }, {})

    const extendParsePaths = buildConfig.extendParsePaths

    // original webpack config
    let webpackConfig = {

      context: projectPaths.root,

      entry: entries,

      resolve: {
        extensions: ['.js'],
        modules: [
          projectPaths.src,
          path.join(projectPaths.root, 'node_modules'),
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

      externals: {},

      module: {
        // noParse: [],
        rules: []
      },
      plugins: [],

      output: {
        path: projectPaths.dist,
        filename: 'static/[name]-[hash].js',
        chunkFilename: 'static/[id]-[chunkhash].js',
        publicPath: env === 'production' ? buildConfig.publicUrl : '/'
      },

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
        extendParsePaths
      )
    })

    // 有的 transform 的添加逻辑比较特别，需要在别的添加完成后再添加，使用最后一个参数 post 标识
    Object.keys(buildConfig.transforms).forEach(key => {
      webpackConfig = require('./addons/add-transform')(
        webpackConfig,
        key,
        buildConfig.transforms[key],
        extendParsePaths,
        true
      )
    })

    const pages = Object.keys(buildConfig.pages).reduce((pages, name) => {
      const page = buildConfig.pages[name]
      // 兼容 page.entries 是字符串不是数组的情况
      const entries = Array.isArray(page.entries) ? page.entries : [page.entries]
      pages[name] = utils.extend({}, page, { entries })
      return pages
    }, {})

    // gen pages
    webpackConfig = require('./addons/gen-pages')(webpackConfig, pages, buildConfig.publicUrl)

    // configure postcss
    webpackConfig = require('./addons/configure-postcss')(webpackConfig)

    // define env
    webpackConfig = require('./addons/define-env')(webpackConfig, env, buildConfig.envVariables)

    return webpackConfig
  }
)