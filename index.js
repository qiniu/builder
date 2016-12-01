/*
 * @file builder
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')
const webpackDevServer = require('webpack-dev-server')

const env = require('./lib/env')
const conf = require('./lib/conf')
const paths = require('./lib/paths')

console.info(`env: ${env}`)

conf.fetch().then(
  projectConfig => {
    const projectPaths = paths.getPaths(projectConfig)
    const entries = Object.keys(projectConfig.entries).reduce((entries, name) => {
      entries[name] = path.join(projectPaths.root, projectConfig.entries[name])
      return entries
    }, {})

    // original webpack config
    let webpackConfig = {

      entry: entries,

      resolve: {
        extensions: ['.js'],
        modules: [
          projectPaths.src,
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
      }
    }

    // add transforms
    Object.keys(projectConfig.transforms).forEach(extension => {
      webpackConfig = require('./webpack/addons/add-transform')(
        webpackConfig,
        extension,
        projectConfig.transforms[extension]
      )
    })

    // gen pages
    webpackConfig = require('./webpack/addons/gen-pages')(webpackConfig, projectConfig.pages)

    // configure postcss
    webpackConfig = require('./webpack/addons/configure-postcss')(webpackConfig)

    // define env
    webpackConfig = require('./webpack/addons/define-env')(webpackConfig, env)

    // addons for production
    if (env === 'production') {
      webpackConfig = require('./webpack/addons/minimize')(webpackConfig)
      webpackConfig = require('./webpack/addons/extract-style')(webpackConfig)
      webpackConfig = require('./webpack/addons/use-chunkhash')(webpackConfig)
      webpackConfig = require('./webpack/addons/use-cdn')(webpackConfig, projectConfig.publicUrl)
    }

    // addons for development
    if (env === 'development') {
      config = require('./webpack/addons/sourcemap')(config)
      config = require('./webpack/addons/hot-dev')(config)
    }

    webpack(webpackConfig, (err, stats) => {
      if (err || stats.hasErrors()) {
        console.error(err)
        console.log(stats.toString({ colors: true }))
        process.exit(1)
      }
      console.log('done')
      process.exit(0)
    });

  }
).catch(
  e => {
    console.error(e)
    process.exit(1)
  }
)
