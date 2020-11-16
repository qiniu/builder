/**
 * @file paths
 * @author nighca <nighca@live.cn>
 */

import * as path from 'path'

import logger from './logger'
import { BuildConfig } from './build-conf'

let buildRoot: string = process.env.BUILD_ROOT || process.cwd()

export function getBuildRoot() {
  return buildRoot
}

export function setBuildRoot(target: string) {
  const resolved = path.resolve(target)
  logger.debug(`set build root: ${target} (${resolved})`)
  buildRoot = resolved
}

/** get absolute path with given path relative to build root */
export function abs(p: string) {
  return path.resolve(buildRoot, p)
}

let buildConfigFilePath = process.env.BUILD_CONFIG_FILE || null
let envVariablesFilePath = process.env.ENV_VARIABLES_FILE || null
let isomorphicToolsFilePath = process.env.ISOMORPHIC_TOOLS_FILE || null

/** get build config file path */
export function getBuildConfigFilePath() {
  return buildConfigFilePath
}

/** set build config file path */
export function setBuildConfigFilePath(target: string) {
  buildConfigFilePath = path.resolve(target)
}

/** get env variables file path */
export function getEnvVariablesFilePath() {
  return envVariablesFilePath
}

/** set env variables file path */
export function setEnvVariablesFilePath(target: string) {
  envVariablesFilePath = path.resolve(target)
}

/** get ssr isomorphic-tools.js file path */
export function getIsomorphicToolsFilePath() {
  return isomorphicToolsFilePath
}

/** set ssr isomorphic-tools.js file path */
export function setIsomorphicToolsFilePath(target: string) {
  isomorphicToolsFilePath = path.resolve(target)
}

/** get src path */
export function getSrcPath(conf: BuildConfig) {
  return abs(conf.srcDir)
}

/** get static path */
export function getStaticPath(conf: BuildConfig){
  return abs(conf.staticDir)
}

/** get dist path */
export function getDistPath(conf: BuildConfig) {
  return abs(conf.distDir)
}

/** get test dist path */
export function getTestDistPath(conf: BuildConfig) {
  return path.join(getDistPath(conf), '.test')
}
