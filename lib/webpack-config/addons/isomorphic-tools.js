const WebpackIsomorphicToolsPlugin = require('webpack-isomorphic-tools/plugin')
const paths = require('../../utils/paths')
const configuration = {
  debug: false,
  webpack_assets_file_path: paths.abs('dist/webpack-assets.json'),
  webpack_stats_file_path: paths.abs('dist/webpack-stats.json'),
  assets: {
    images: {
      extensions: ['png', 'jpg', 'gif', 'jpeg']
    },
    fonts: {
      extensions: ['woff', 'woff2', 'ttf', 'eot']
    },
    styleModules: {
      extensions: ['less', 'scss', 'styl'],
      parser: module => module.source
    }
  }
}

const webpackIsomorphicToolsPlugin = new WebpackIsomorphicToolsPlugin(configuration)

module.exports = (config) => {
  config.plugins.push(
    webpackIsomorphicToolsPlugin
  )
  return config
}
