/**
 * @file config for common-chunks
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const chunks = require('../../constants/chunks')
const buildEnv = require('../../utils/build-env')
const { isGlobalPolyfill } = require('../../constants/polyfill')

module.exports = (config, optimization) => {
  const { addPolyfill } = optimization
  const optCommon = optimization.extractCommon
  const optVendor = optimization.extractVendor

  const chunksName = (
    isGlobalPolyfill(addPolyfill) && buildEnv.get() === buildEnv.prod
    ? chunk => chunk.name !== chunks.polyfill
    : 'all'
  )

  const cacheGroups = {}

  if (optVendor) {
    cacheGroups[optVendor] = {
      name: optVendor,
      chunks: chunksName,
      minSize: Infinity
    }
  }

  const splitChunksOptions = optCommon
    ? { chunks: chunksName, name: chunks.common, cacheGroups }
    : { chunks: chunksName, name: chunks.common, minSize: Infinity, cacheGroups }

  return update(config, { optimization: { splitChunks: { $set: splitChunksOptions } } })
}
