/*
 * @file config for define env
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = (config, env) => {
  config.plugins.push(new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify(env)
    },
    'ENV': process.env.ENV
  }))
  return config
}
