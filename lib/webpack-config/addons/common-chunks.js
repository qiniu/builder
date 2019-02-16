/*
 * @file config for common-chunks
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')
const chunks = require('../../constants/chunks')

module.exports = (config) => {
  if (!config.optimization) {
    config.optimization = {}
  }
  config.optimization.splitChunks = {
    chunks: 'all'
  }
  return config
}
