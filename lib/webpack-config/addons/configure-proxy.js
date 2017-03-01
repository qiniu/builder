/*
 * @file config for devServer proxy
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')

const utils = require('../../utils')

const defaultProxyOptions = {
  changeOrigin: true
}

const adaptProxyOptions = (options) => {
  if (typeof options === 'string') {
    options = { target: options }
  }
  return utils.extend({}, defaultProxyOptions, options)
}

module.exports = (webpackConfig, devProxy) => {
  const proxy = {}

  Object.keys(devProxy).forEach(context => {
    proxy[context] = adaptProxyOptions(devProxy[context])
  })

  return update(webpackConfig, {
    devServer: { proxy: {
      $set: proxy
    } }
  })
}
