/*
 * @file clean dist
 * @author nighca <nighca@live.cn>
 */

const del = require('del')

const conf = require('./conf')
const paths = require('./paths')

module.exports = () => conf.fetch().then(
  projectConfig => {
    const dist = paths.getPaths(projectConfig).dist
    return del(dist)
  }
)
