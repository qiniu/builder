/*
 * @file webpack config for serve
 * @author nighca <nighca@live.cn>
 */

let config = require('./dev')

config = require('./addons/hot-dev')(config)

module.exports = config
