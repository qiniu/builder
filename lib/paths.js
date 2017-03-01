/*
 * @file paths
 * @author nighca <nighca@live.cn>
 */

const path = require('path')

const projectRoot = process.env.BUILD_ROOT || '/fec/input'
const abs = p => path.resolve(projectRoot, p)

module.exports = {
  abs,
  getPaths(conf) {
    return {
      root: projectRoot,
      src: abs(conf.srcDir),
      static: abs(conf.staticDir),
      dist: abs('dist')
    }
  }
}
