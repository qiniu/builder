/*
 * @file hot dev config
 * @author nighca <nighca@live.cn>
 */

const _ = require('lodash')
const webpack = require('webpack')
const update = require('immutability-helper')

module.exports = config => {

  config = update(config, {
    plugins: { $push: [
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin()
    ] },
    devServer: { $merge: {
      hot: true,
      // devServer 中的 public 字段会被拿去计算得到 hot module replace 相关请求的 URI
      // 这里用 0.0.0.0:0 可以让插到页面的 client 脚本自动依据 window.location 去获得 host
      // 从而正确地建立 hot module replace 依赖的 ws 链接及其它请求，逻辑见：
      // https://github.com/webpack/webpack-dev-server/blob/v2.4.5/client/index.js#L149
      // https://github.com/webpack/webpack-dev-server/blob/v2.4.5/client/index.js#L157
      // 这里之所以要求使用页面的 window.location 信息，避免在编译期由 addDevServerEntrypoints
      // （require('webpack-dev-server').addDevServerEntrypoints，见 lib/serve.js）
      // 通过 port、host 等配置计算出 页面的 host，是因为 builder 在容器中 serve 时端口会被转发，
      // 即可能配置 port 为 80，在（宿主机）浏览器中通过 8080 端口访问
      public: '0.0.0.0:0',
      inline: true,
      stats: {
        colors: true,
        cached: false,
        cachedAssets: false
      }
    } }
  })

  return config
}
