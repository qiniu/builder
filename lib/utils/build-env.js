/*
 * @file env info
 * @author nighca <nighca@live.cn>
 */

const fs = require('fs')
const paths = require('./paths')

let env = process.env.BUILD_ENV

/**
 * @desc get build env
 * @return {string}
 */
const getEnv = () => env

/**
 * @desc set build env
 * @param  {string} target
 * @return {string}
 */
const setEnv = (target) => {
  env = process.env.NODE_ENV = target
}

/**
 * @desc is typescript project
 * @return {boolean}
 */
const isTypescriptProject = () => {
  return fs.existsSync(paths.abs('tsconfig.json'))
}

// use `development` as default env
if (!env) {
  setEnv('development')
}

module.exports = {
  get: getEnv,
  set: setEnv,
  isTypescriptProject
}
