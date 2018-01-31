/*
 * @file config for define env
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')
const chunks = require('../../constants/chunks')

module.exports = (config, optimization) => {
  const optCommon = optimization.extractCommon
  const optVendor = optimization.extractVendor

  const plugins = []

  if (optVendor) {
    plugins.push(
      new webpack.optimize.CommonsChunkPlugin({
        name: optVendor,
        minChunks: Infinity
      })
    )
  }
  if (optCommon) {
    plugins.push(
      new webpack.optimize.CommonsChunkPlugin({
        name: chunks.common
      }),
      new webpack.optimize.CommonsChunkPlugin({
        children: true,
        async: true
      })
    )
  }

  if (optVendor && !optCommon) {
    plugins.push(
      new webpack.optimize.CommonsChunkPlugin({
        name: chunks.manifest,
        minChunks: Infinity
      })
    )
  }

  return update(config, {
    plugins: { $push: plugins }
  })
}
