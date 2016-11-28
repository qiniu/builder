/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

let config = require('./common')

config = require('./addons/sourcemap')(config)
config = require('./addons/define-env')(config, 'development')

module.exports = config
