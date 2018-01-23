const update = require('immutability-helper')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const buildEnv = require('../../utils/build-env')
module.exports = (webpackConfig, options) => {
  if (buildEnv.isTypescriptProject()) {
    webpackConfig = update(webpackConfig, {
      plugins: {
        $push: [new ForkTsCheckerWebpackPlugin()]
      }
    })
  }
  return webpackConfig
}
