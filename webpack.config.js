/*
 * @file webpack config
 * @author nighca <nighca@live.cn>
 */

const env = require('./lib/env')

switch(env) {
  case 'development':
    module.exports = require('./webpack/dev')
    break
  case 'production':
    module.exports = require('./webpack/prod')
    break
  default:
    throw new TypeError(`Invalid env: ${env}`)
}
