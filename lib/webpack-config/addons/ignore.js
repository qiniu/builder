/**
 * @file minimize config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = (config, pattern) => {
  config.plugins.push(
    new webpack.IgnorePlugin(pattern)
  )
  return config
}
