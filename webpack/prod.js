/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const conf = require('../lib/conf')
let config = require('./common')

config = require('./addons/minimize')(config)
config = require('./addons/extract-style')(config)
config = require('./addons/use-chunkhash')(config)
config = require('./addons/use-cdn')(config, conf.publicUrl)
config = require('./addons/define-env')(config, 'production')

module.exports = config
