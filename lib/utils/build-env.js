/*
 * @file env info
 * @author nighca <nighca@live.cn>
 */

let env = process.env.BUILD_ENV || 'development'

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
const setEnv = (target) => env = target

module.exports = {
  get: getEnv,
  set: setEnv
}
