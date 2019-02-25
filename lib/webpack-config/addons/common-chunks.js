/*
 * @file config for common-chunks
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')
const chunks = require('../../constants/chunks')

module.exports = (config, optimization) => {
  const optVender = optimization.extractVendor

  const cacheGroups = {}

  if (optVender) {
    cacheGroups[optVender] = {
      name: optVender,
      chunks: 'initial',
      filename: 'static/[name].[hash].bundle.js'
    }
  }

  config.optimization = update(config.optimization, { splitChunks: { $set: { chunks: 'all', cacheGroups } } })

  return config
}
