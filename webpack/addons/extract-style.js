/*
 * @file extract style content config
 * @author nighca <nighca@live.cn>
 */

const ExtractTextPlugin = require('extract-text-webpack-plugin')

const extractTextIfNecessary = loaderConfig => {
  const loaders = loaderConfig.loaders || loaderConfig.loader.split('!')
  if (!(loaders[0] === 'style' || loaders[0] === 'style-loader')) {
    return loaderConfig
  }

  const loader = ExtractTextPlugin.extract(loaders.shift(), loaders.join('!'))
  return Object.keys(loaderConfig).reduce((newConfig, key) => {
    if (key !== 'loader' && key !== 'loaders') {
      newConfig[key] = loaderConfig[key]
    }
    return newConfig
  }, { loader })
}

module.exports = config => {

  config.module.loaders = config.module.loaders.map(
    extractTextIfNecessary
  )

  config.plugins.push(
    new ExtractTextPlugin('static/[name]-[chunkhash].css')
  )

  return config
}
