const update = require('immutability-helper')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

module.exports = (webpackConfig, options) => {
  webpackConfig = update(webpackConfig, {
    plugins: {
      $push: [new ForkTsCheckerWebpackPlugin()]
    }
  })
  return webpackConfig
}
