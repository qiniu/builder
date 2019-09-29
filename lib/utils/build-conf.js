/**
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
 * @typedef {object} Engines
 * @property {string} builder - required builder version range
 */

/**
 * @typedef {object} TestConfig
 * @property {string[]} setupFiles - files to run before each test
 * @property {object} moduleNameMapper - map for modules, like https://facebook.github.io/jest/docs/en/configuration.html#modulenamemapper-object-string-string
 */

/**
 * @typedef {object} Optimization
 * @property {boolean} extractCommon 是否抽取 entries 间的公共内容到单独的文件中
 * @property {string} extractVendor 抽取固定依赖行为
 * @property {boolean} compressImage 是否压缩图片
 * @property {boolean|string[]} transformDeps 是否对第三方依赖包的 Javascript 内容进行转换
 */

/**
 * @typedef {object} BuildConfig
 * @property {string} extends - target config to extend
 * @property {string} publicUrl
 * @property {string} srcDir
 * @property {string} staticDir
 * @property {string} distDir
 * @property {object} entries
 * @property {object} pages
 * @property {object} transforms
 * @property {string[]} transformIncludes - 构建时需要被包含进来（被 transformer 处理）的第三方内容
 * @property {object} envVariables - 注入到代码中的环境变量
 * @property {object} isomorphicTools - ssr 相关的 webpack-isomorphic-tools config
 * @property {Optimization} optimization
 * @property {object} devProxy
 * @property {object} deploy
 * @property {object} targets
 * @property {TestConfig} test
 * @property {Engines} engines
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
    deploy: utils.extend({}, cfg1.deploy, cfg2.deploy),
    test: utils.extend({}, cfg1.test, cfg2.test)
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
 * @desc lookup extends target
 * @param  {string} name name of extends target
 * @param  {string} sourceConfigFilePath path of source config file
 * @return {Promise<string>}
 */
const lookupExtendsTarget = (name, sourceConfigFilePath) => {
  logger.debug(`lookup extends target config: ${name}`)

  const presetConfigFilePath = path.resolve(__dirname, `../../preset-configs/${name}.json`)
  logger.debug(`try preset config: ${presetConfigFilePath}`)
  if (fs.existsSync(presetConfigFilePath)) {
    logger.debug(`found preset config: ${presetConfigFilePath}`)
    return Promise.resolve(presetConfigFilePath)
  }

  const sourceConfigFileDir = path.dirname(sourceConfigFilePath)
  const localConfigFilePath = path.resolve(sourceConfigFileDir, name)
  logger.debug(`try local config: ${localConfigFilePath}`)
  if (fs.existsSync(localConfigFilePath)) {
    logger.debug(`found local config: ${localConfigFilePath}`)
    return Promise.resolve(localConfigFilePath)
  }

  const localConfigFilePathWithExtension = path.resolve(sourceConfigFileDir, `${name}.json`)
  logger.debug(`try local config with extension: ${localConfigFilePathWithExtension}`)
  if (fs.existsSync(localConfigFilePathWithExtension)) {
    logger.debug(`found local config with extension: ${localConfigFilePathWithExtension}`)
    return Promise.resolve(localConfigFilePathWithExtension)
  }

  // TODO: 支持以 npm 包的方式发布 config
  // 即，这里查找 preset config & local config 失败后，再去尝试 npm package

  const message = `lookup extends target config failed: ${name}`
  logger.debug(message)
  return Promise.reject(new Error(message))
}

/**
 * @desc get extends target content
 * @param  {string} name name of extends target
 * @param  {string} sourceConfigFilePath path of source config file
 * @return {Promise<BuildConfig>}
 */
const getExtendsTarget = (name, sourceConfigFilePath) => {
  return lookupExtendsTarget(name, sourceConfigFilePath).then(
    configFilePath => readAndResolveConfig(configFilePath)
  )
}

/**
 * @desc resolve config content by recursively get and merge config to `extends`
 * @param  {string} configFilePath path of given config
 * @return {Promise<BuildConfig>}
 */
const readAndResolveConfig = (configFilePath) => {
  const config = readConfig(configFilePath)
  const extendsTarget = config.hasOwnProperty('extends') ? config['extends'] : 'default'
  if (!extendsTarget) {
    return Promise.resolve(config)
  }
  return getExtendsTarget(extendsTarget, configFilePath).then(
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

  // 若指定了 build config file path，则使用之
  // 否则使用 build root 下的 build config 文件
  const configFilePath = paths.getBuildConfigFilePath() || paths.abs(files.config)
  logger.debug(`use build config file: ${configFilePath}`)

  return cached = readAndResolveConfig(configFilePath).then(
    config => {
      // 若指定了 env variables file path
      // 读取之并覆盖 build config 中的 envVariables 字段
      const envVariablesFilePath = paths.getEnvVariablesFilePath()
      if (envVariablesFilePath) {
        logger.debug(`use env variables file: ${envVariablesFilePath}`)
        const envVariables = readEnvVariables(envVariablesFilePath)
        config.envVariables = envVariables
      }

      const isomorphicToolsFilePath = paths.getIsomorphicToolsFilePath()
      if (isomorphicToolsFilePath) {
        logger.debug(`use isomorphic-tools file: ${isomorphicToolsFilePath}`)
        config.isomorphicTools = require(isomorphicToolsFilePath)
      }

      logger.debug('result build config:')
      logger.debug(config)
      return config
    }
  )
}

module.exports = {
  find: findConfig
}
