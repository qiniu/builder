/**
 * @file config for devServer proxy
 * @author nighca <nighca@live.cn>
 */

const url = require('url')
const update = require('immutability-helper')

const utils = require('../../utils')

const defaultProxyOptions = {

  changeOrigin: true,

  onProxyReq(proxyReq, req, res) {
    // add header `X-Real-IP`
    const origin = proxyReq.getHeader('origin')
    if (origin) {
      proxyReq.setHeader(
        "X-Real-IP",
        url.parse(origin).hostname
      )
    }

    // fix `referer` to avoid csrf detect
    const referer = proxyReq.getHeader('referer')
    if (referer) {
      proxyReq.setHeader(
        'referer',
        referer.replace(
          url.parse(referer).host,
          proxyReq.getHeader('host')
        )
      )
    }
  },

  onProxyRes(proxyRes, req, res) {
    // 干掉 set-cookie 中的 secure 设置，因为本地开发 server 是 http 的
    // TODO: 考虑支持 https dev server？
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(
        cookie => cookie.replace('; Secure', '')
      )
    }
  }

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
