/*
 * @file webpack config for serve
 * @author nighca <nighca@live.cn>
 */

module.exports = require('./dev').then(
  config => {
    config = require('./addons/hot-dev')(config)
    return config
  }
)
