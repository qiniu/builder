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
    loader: loaders,
    fallbackLoader: styleLoader
  })

  // ExtractTextPlugin 的结果暂时只能用在 loader 字段上，以 use / loaders 字段传入会报错：
  // Module build failed: Error: Cannot find module '/fec/node_modules/extract-text-webpack-plugin/loader.js?{"omit":0,"remove":true}!css'
  // 暂时先用 loader，但这会导致不一致：不受影响的 loader 通过 use 字段配置，受影响的通过 loader 字段配置
  return utils.extend({}, rule, {
    // use: [{ loader }]
    use: undefined,
    loader
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
