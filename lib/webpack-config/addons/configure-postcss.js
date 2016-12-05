/*
 * @file config for configure postcss
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = (config, options) => {
  config.plugins.push(new webpack.LoaderOptionsPlugin({
    options: {
      postcss: {}
    }
  }))
  return config
}
