/*
 * @file minimize config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = config => {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  )
  return config
}
