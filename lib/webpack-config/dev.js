/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

module.exports = require('./common').then(
  config => {
    config = require('./addons/sourcemap')(config)
    config = require('./addons/define-env')(config, 'development')
    return config
  }
)
