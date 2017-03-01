/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = Promise.all([
  require('./common'),
  require('../conf')
]).then(
  ([config, conf]) => {
    config = require('./addons/minimize')(config)
    config = require('./addons/extract-style')(config)
    config = require('./addons/use-chunkhash')(config)
    config = require('./addons/use-cdn')(config, conf.publicUrl)
    config = require('./addons/define-env')(config, 'production')
    return config
  }
)

