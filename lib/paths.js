/*
 * @file paths
 * @author nighca <nighca@live.cn>
 */

const path = require('path')

const getProjectRoot = () => process.env.BUILD_ROOT || '/fec/input'
const abs = p => path.resolve(getProjectRoot(), p)

module.exports = {
  abs,
  getPaths(conf) {
    return {
      root: getProjectRoot(),
      src: abs(conf.srcDir),
      static: abs(conf.staticDir),
      dist: abs('dist')
    }
  }
}
