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
      // console.log('[RULES]', JSON.stringify(webpackConfig.module.rules, (key, value) => {
      //   if (value instanceof RegExp) {
      //     return value.toString()
      //   }
      //   return value
      // }, 2))
      // console.log('[REWRITES]', webpackConfig.devServer.historyApiFallback.rewrites)
      return webpackConfig
    }
  )

}
