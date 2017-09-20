/*
 * @file config
 * @author nighca <nighca@live.cn>
 */

const fs = require('fs')
const path = require('path')

const files = require('../constants/files')
const utils = require('./index')
const paths = require('./paths')
const logger = require('./logger')

/**
 * The complete Triforce, or one or more components of the Triforce.
 * @typedef {object} BuildConfig
 * @property {string} extends - target config to extend
 * @property {string} publicUrl
 * @property {string} srcDir
 * @property {string} staticDir
 * @property {string} distDir
 * @property {object} entries
 * @property {object} pages
 * @property {object} transforms
 * @property {object} envVariables - 注入到代码中的环境变量
 * @property {object} optimization
 * @property {object} devProxy
 * @property {object} deploy
 */

/**
 * @desc merge two config content
 * @param  {BuildConfig} cfg1
 * @param  {BuildConfig} cfg2
 * @return {BuildConfig}
 */
const mergeConfig = (cfg1, cfg2) => {
  return utils.extend({}, cfg1, cfg2, {
    optimization: utils.extend({}, cfg1.optimization, cfg2.optimization),
    transforms: utils.extend({}, cfg1.transforms, cfg2.transforms),
    deploy: utils.extend({}, cfg1.deploy, cfg2.deploy)
  })
}

/**
 * @desc parse config content
 * @param  {string} cnt
 * @return {BuildConfig}
 */
const parseConfig = (cnt) => JSON.parse(cnt)

/**
 * @desc read and parse config content
 * @param  {string} configFilePath
 * @return {BuildConfig}
 */
const readConfig = (configFilePath) => {
  const configFileRawContent = fs.readFileSync(configFilePath, { encoding: 'utf8' })
  const configFileContent = parseConfig(configFileRawContent)
  return configFileContent
}

const parseEnvVariables = (cnt) => JSON.parse(cnt)

const readEnvVariables = (envVariablesFilePath) => {
  const envVariablesFileRawContent = fs.readFileSync(envVariablesFilePath, { encoding: 'utf8' })
  const envVariablesFileContent = parseEnvVariables(envVariablesFileRawContent)
  return envVariablesFileContent
}

/**
 * @desc get preset config content with given name
 * @param  {string} name
 * @return {Promise<BuildConfig>}
 */
const getPresetConfig = name => {
  // TODO: 重新实现
  const presetConfigFilePath = path.resolve(__dirname, `../../preset-configs/${name}.json`)
  const presetConfig = readConfig(presetConfigFilePath)
  return Promise.resolve(presetConfig)
}

/**
 * @desc get config content with given name
 * @param  {string} name
 * @return {Promise<BuildConfig>}
 */
const getConfig = name => {
  // TODO: 查找策略：根据 name 判断是预设规则还是外部 config
  return getPresetConfig(name).then(
    presetConfig => resolveConfig(presetConfig)
  )
}

/**
 * @desc resolve config content by recursively get and merge config to `extends`
 * @param  {BuildConfig} config
 * @return {Promise<BuildConfig>}
 */
const resolveConfig = config => {
  const extendsTarget = config.hasOwnProperty('extends') ? config['extends'] : 'default'
  if (!extendsTarget) {
    return Promise.resolve(config)
  }
  return getConfig(extendsTarget).then(
    extendsConfig => mergeConfig(extendsConfig, config)
  )
}

let cached = null

/**
 * @desc find config file and resolve config content based on paths info
 * @return {Promise<BuildConfig>}
 */
const findConfig = () => {
  if (cached) {
    return cached
  }
  return cached = new Promise(resolve => {
    const configFilePath = paths.abs(files.config)
    logger.debug(`find build config: ${configFilePath}`)

    const configFileContent = readConfig(configFilePath)

    // 若指定了 env variables file path
    // 读取之并覆盖 build config 中的 envVariables 字段
    const envVariablesFilePath = paths.getEnvVariablesFilePath()
    if (envVariablesFilePath) {
      logger.debug(`find env variables: ${envVariablesFilePath}`)
      const envVariables = readEnvVariables(envVariablesFilePath)
      configFileContent.envVariables = envVariables
    }

    logger.debug('result build config content:')
    logger.debug(configFileContent)

    resolve(resolveConfig(configFileContent))
  })
}

module.exports = {
  find: findConfig
}
