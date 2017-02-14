/*
 * @file webpack config
 * @author nighca <nighca@live.cn>
 */

const env = require('../env')

module.exports = function() {

  const webpackConfigPromise = (
    env === 'production'
    ? require('./prod')
    : require('./serve')
  )

  return webpackConfigPromise.then(
    webpackConfig => {
      console.log('[WEBPACK CONFIG]', webpackConfig)
      return webpackConfig
    }
  )

}
