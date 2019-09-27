/**
 * @file env info
 * @author nighca <nighca@live.cn>
 */

let env = process.env.BUILD_ENV

const test = 'test'
const dev = 'development'
const prod = 'production'

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

// use `development` as default env
if (!env) {
  setEnv(dev)
}

module.exports = {
  test,
  dev,
  prod,
  get: getEnv,
  set: setEnv
}
