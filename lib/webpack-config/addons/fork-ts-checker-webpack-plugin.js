const update = require('immutability-helper')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const isTypescriptProject = require('../../utils/project').isTypescriptProject

module.exports = (webpackConfig, options) => {
  if (isTypescriptProject()) {
    webpackConfig = update(webpackConfig, {
      plugins: {
        $push: [new ForkTsCheckerWebpackPlugin()]
      }
    })
  }
  return webpackConfig
}
