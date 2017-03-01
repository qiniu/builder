/*
 * @file clean dist
 * @author nighca <nighca@live.cn>
 */

const del = require('del')

const paths = require('./paths')

module.exports = () => require('./conf').then(
  projectConfig => {
    const dist = paths.getPaths(projectConfig).dist
    return del(dist)
  }
)
