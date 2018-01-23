/*
 * @file project relative util methods
 * @author nighca <nighca@live.cn>
 */

const fs = require('fs')
const paths = require('./paths')

/**
 * @desc is typescript project
 * @return {boolean}
 */
const isTypescriptProject = () => {
  return fs.existsSync(paths.abs('tsconfig.json'))
}

module.exports = {
  isTypescriptProject
}
