/*
 * @file extract style content config
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const utils = require('../../utils')

const extractTextIfNecessary = rule => {
  const loaders = rule.use
  const firstLoaderName = loaders[0].__loaderName__
  if (firstLoaderName !== 'style-loader') {
    return rule
  }

  loaders.splice(0, 1, MiniCssExtractPlugin.loader)

  return rule
}

module.exports = webpackConfig => {

  webpackConfig = update(webpackConfig, {
    module: { rules: {
      $set: webpackConfig.module.rules.map(
        extractTextIfNecessary
      )
    } },
    plugins: {
      $push: [new MiniCssExtractPlugin({
        filename: 'static/[name]-[contenthash].css',
        chunkFilename: "static/[id]-[contenthash].css"
      })]
    }
  })

  return webpackConfig
}
