/*
 * @file config for common-chunks
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')

module.exports = (config, optimization) => {
  const optCommon = optimization.extractCommon
  const optVender = optimization.extractVendor

  const cacheGroups = {}

  if (optVender) {
    cacheGroups[optVender] = {
      name: optVender,
      chunks: 'initial',
      filename: 'static/[name].[hash].js'
    }
  }

  const splitChunksOptions = optCommon
    ? { chunks: 'all', cacheGroups }
    : { chunks: 'all', minSize: Infinity, cacheGroups }

  config.optimization = update(config.optimization, {
    splitChunks: { $set: splitChunksOptions }
  })

  return config
}
