/*
 * @file builder
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')
const webpackDevServer = require('webpack-dev-server')

const env = require('../env')
const paths = require('../paths')

console.info(`env: ${env}`)

module.exports = require('../conf').then(
  projectConfig => {
    console.log('[PROJECT CONFIG]', projectConfig)

    const projectPaths = paths.getPaths(projectConfig)
    const entries = Object.keys(projectConfig.entries).reduce((entries, name) => {
      entries[name] = path.join(projectPaths.root, projectConfig.entries[name])
      return entries
    }, {})

    // original webpack config
    let webpackConfig = {

      context: projectPaths.root,

      entry: entries,

      resolve: {
        extensions: ['.js'],
        modules: [
          projectPaths.src,
          path.join(projectPaths.root, 'node_modules'),
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
        publicPath: projectConfig.publicUrl
      },

      devServer: {
        historyApiFallback: {
          rewrites: [
          ]
        }
      }
    }

    // add transforms
    Object.keys(projectConfig.transforms).forEach(key => {
      webpackConfig = require('./addons/add-transform')(
        webpackConfig,
        key,
        projectConfig.transforms[key]
      )
    })

    // gen pages
    webpackConfig = require('./addons/gen-pages')(webpackConfig, projectConfig.pages, projectConfig.publicUrl)

    // configure postcss
    webpackConfig = require('./addons/configure-postcss')(webpackConfig)

    // define env
    webpackConfig = require('./addons/define-env')(webpackConfig, env)

    return webpackConfig
  }
)