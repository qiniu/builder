/*
 * @file extract style content config
 * @author nighca <nighca@live.cn>
 */

const ExtractTextPlugin = require('extract-text-webpack-plugin')
const utils = require('../../utils')

const extractTextIfNecessary = rule => {
  const loaders = rule.use
  const firstLoaderName = loaders[0].loader
  if (firstLoaderName !== 'style-loader') {
    return rule
  }

  const styleLoader = loaders.shift()
  const loader = ExtractTextPlugin.extract({
    use: loaders,
    fallback: styleLoader
  })

  return utils.extend({}, rule, {
    use: loader
  })
}

module.exports = config => {

  config.module.rules = config.module.rules.map(
    extractTextIfNecessary
  )

  config.plugins.push(
    new ExtractTextPlugin({
      filename: 'static/[name]-[chunkhash].css'
    })
  )

  return config
}
