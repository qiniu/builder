/*
 * @file extract style content config
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const utils = require('../../utils')

const extractTextIfNecessary = rule => {
  const loaders = rule.use
  const firstLoaderName = loaders[0].loader
  if (firstLoaderName !== 'style-loader') {
    return rule
  }

  const styleLoader = loaders.shift()
  const extracted = ExtractTextPlugin.extract({
    use: loaders,
    fallback: styleLoader
  })

  return utils.extend({}, rule, {
    use: extracted
  })
}

module.exports = webpackConfig => {

  webpackConfig = update(webpackConfig, {
    module: { rules: {
      $set: webpackConfig.module.rules.map(
        extractTextIfNecessary
      )
    } },
    plugins: {
      $push: [new ExtractTextPlugin({
        filename: 'static/[name]-[contenthash].css'
      })]
    }
  })

  return webpackConfig
}
