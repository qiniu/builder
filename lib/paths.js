/*
 * @file paths
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const conf = require('./conf')

const projectDir = path.resolve(__dirname, '../input')
const abs = p => path.resolve(projectDir, p)

module.exports = {
  abs,
  root: projectDir,
  src: abs(conf.srcDir),
  static: abs(conf.staticDir),
  dist: abs('dist')
}
