/**
 * @file paths
 * @author nighca <nighca@live.cn>
 */

const path = require('path')

const logger = require('./logger')
const files = require('../constants/files')

let buildRoot = process.env.BUILD_ROOT || process.cwd()

/**
 * @desc get build root
 * @return {string}
 */
const getBuildRoot = () => buildRoot

/**
 * @desc set build root
 * @param  {string} target
 * @return {string}
 */
const setBuildRoot = target => {
  const resolved = path.resolve(target)
  logger.debug(`set build root: ${target} (${resolved})`)
  buildRoot = resolved
}

/**
 * @desc get absolute path with given path relative to build root
 * @param  {string} p
 * @return {string}
 */
const abs = p => path.resolve(buildRoot, p)

let buildConfigFilePath = process.env.BUILD_CONFIG_FILE || null
let envVariablesFilePath = process.env.ENV_VARIABLES_FILE || null
let isomorphicToolsFilePath = process.env.ISOMORPHIC_TOOLS_FILE || null

/**
 * @desc get build config file path
 * @return {string}
 */
const getBuildConfigFilePath = () => buildConfigFilePath

/**
 * @desc set build config file path
 * @param  {string} target
 * @return {string}
 */
const setBuildConfigFilePath = target => buildConfigFilePath = path.resolve(target)

/**
 * @desc get env variables file path
 * @return {string}
 */
const getEnvVariablesFilePath = () => envVariablesFilePath

/**
 * @desc set env variables file path
 * @param  {string} target
 * @return {string}
 */
const setEnvVariablesFilePath = target => envVariablesFilePath = path.resolve(target)

/**
* @desc get ssr isomorphic-tools.js file path
* @return {string}
*/
const getIsomorphicToolsFilePath = () => isomorphicToolsFilePath

/**
 * @desc set ssr isomorphic-tools.js file path
 * @param  {string} target
 * @return {string}
 */
const setIsomorphicToolsFilePath = target => isomorphicToolsFilePath = path.resolve(target)

/**
 * @desc get src path
 * @return {string}
 */
const getSrcPath = conf => abs(conf.srcDir)

/**
 * @desc get static path
 * @return {string}
 */
const getStaticPath = conf => abs(conf.staticDir)


/**
 * @desc get dist path
 * @return {string}
 */
const getDistPath = conf => abs(conf.distDir)

/**
 * @desc get test dist path
 * @return {string}
 */
const getTestDistPath = conf => path.join(getDistPath(conf), '.test')

module.exports = {
  abs,
  getBuildRoot,
  setBuildRoot,
  getSrcPath,
  getStaticPath,
  getDistPath,
  getTestDistPath,
  getBuildConfigFilePath,
  setBuildConfigFilePath,
  getEnvVariablesFilePath,
  setEnvVariablesFilePath,
  getIsomorphicToolsFilePath,
  setIsomorphicToolsFilePath
}
