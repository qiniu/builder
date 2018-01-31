/*
 * @file config for define env
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')
const chunks = require('../../constants/chunks')

module.exports = (config, optimization) => {
  const optCommon = optimization['extract-common']
  const optVendor = optimization['extract-vendor']

  const plugins = []

  if (optVendor) {
    plugins.push(
      new webpack.optimize.CommonsChunkPlugin({
        name: optVendor,
        minChunks: Infinity
      })
    )
  }
  if (optCommon || optVendor) {
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

  return update(config, {
    plugins: { $push: plugins }
  })
}
