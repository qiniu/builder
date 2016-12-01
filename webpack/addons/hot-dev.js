/*
 * @file hot dev config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = config => {

  // 把这部分功能先通过 webpack-dev-server 的 cli 参数实现
  // 通过这里配置功能会不完整（webpack-dev-server nodejs api 提供的参数不如 cli 全）

  // config.plugins = config.plugins.concat([
  //   new webpack.optimize.OccurenceOrderPlugin(),
  //   new webpack.HotModuleReplacementPlugin(),
  //   new webpack.NoErrorsPlugin()
  // ])

  // config.entry should be a object: { home: 'src/entry/home' }
  // Object.keys(config.entry).forEach(name => {
  //   entries = config.entry[name]
  //   entries = Array.isArray(entries) ? entries : [entries]
  //   config.entry[name] = entries.concat('webpack/hot/dev-server')
  // })

  config.devServer = {
    // hot: true,
    compress: false,
    port: 80,
    host: '0.0.0.0',
    inline: true,
    // noInfo: true,
    publicPath: 'localhost:0'
  }

  return config
}
