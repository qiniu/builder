/*
 * @file webpack config
 * @author nighca <nighca@live.cn>
 */

const env = require('../env')

module.exports = function() {

  if (env === 'production') {
    return require('./prod')
  }

  if (env === 'development') {
    return require('./serve')
  }

}
