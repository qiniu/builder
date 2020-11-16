import * as fs from 'fs'
import * as path from 'path'
import files from '../constants/files'
import { extend } from '.'
import { getBuildConfigFilePath, abs, getEnvVariablesFilePath, getIsomorphicToolsFilePath } from './paths'
import logger from './logger'

export interface Engines {
  /** required builder version range */
  builder: string
}

export interface TestConfig {
  /** files to run before each test */
  setupFiles: string[]
  /** map for modules, like https://facebook.github.io/jest/docs/en/configuration.html#modulenamemapper-object-string-string */
  moduleNameMapper: Record<string, string>
}

export interface Optimization {
  /** 是否抽取 entries 间的公共内容到单独的文件中 */
  extractCommon: boolean
  /** 抽取固定依赖行为 */
  extractVendor: string
  /** 是否压缩图片 */
  compressImage: boolean
  /** 是否对第三方依赖包的 Javascript 内容进行转换 */
  transformDeps: boolean|string[]
}

interface EnvVariables {
  [key: string]: unknown
}

export interface BuildConfig {
  /** target config to extend */
  extends: string
  publicUrl: string
  srcDir: string
  staticDir: string
  distDir: string
  entries: object
  pages: object
  transforms: object
  /** 构建时需要被包含进来（被 transformer 处理）的第三方内容 */
  transformIncludes: string[]
  /** 注入到代码中的环境变量 */
  envVariables: EnvVariables,
  /** ssr 相关的 webpack-isomorphic-tools config */
  isomorphicTools: object
  optimization: Optimization
  devProxy: object
  deploy: object
  targets: object
  test: TestConfig
  engines: Engines
}

/** merge two config content */
function mergeConfig(cfg1: BuildConfig, cfg2: BuildConfig): BuildConfig {
  return extend<BuildConfig>({}, cfg1, cfg2, {
    optimization: extend({}, cfg1.optimization, cfg2.optimization) as Optimization,
    transforms: extend({}, cfg1.transforms, cfg2.transforms),
    deploy: extend({}, cfg1.deploy, cfg2.deploy),
    test: extend({}, cfg1.test, cfg2.test) as TestConfig
  }) as BuildConfig
}

/** parse config content */
const parseConfig = (cnt: string) => JSON.parse(cnt) as BuildConfig

/** read and parse config content */
const readConfig = (configFilePath: string) => {
  const configFileRawContent = fs.readFileSync(configFilePath, { encoding: 'utf8' })
  const configFileContent = parseConfig(configFileRawContent)
  return configFileContent
}

const parseEnvVariables = (cnt: string) => JSON.parse(cnt) as EnvVariables

const readEnvVariables = (envVariablesFilePath: string) => {
  const envVariablesFileRawContent = fs.readFileSync(envVariablesFilePath, { encoding: 'utf8' })
  const envVariablesFileContent = parseEnvVariables(envVariablesFileRawContent)
  return envVariablesFileContent
}

/** lookup extends target */
function lookupExtendsTarget (
  /** name of extends target */
  name: string,
  /** path of source config file */
  sourceConfigFilePath: string
): Promise<string> {
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

/** get extends target content */
async function getExtendsTarget(
  /** name of extends target */
  name: string,
  /** path of source config file */
  sourceConfigFilePath: string
): Promise<BuildConfig> {
  const configFilePath = await lookupExtendsTarget(name, sourceConfigFilePath)
  return readAndResolveConfig(configFilePath)
}

/** resolve config content by recursively get and merge config to `extends` */
async function readAndResolveConfig(
  /** path of given config */
  configFilePath: string
): Promise<BuildConfig> {
  const config = readConfig(configFilePath)
  const extendsTarget = config.hasOwnProperty('extends') ? config['extends'] : 'default'
  if (!extendsTarget) {
    return Promise.resolve(config)
  }
  const extendsConfig = await getExtendsTarget(extendsTarget, configFilePath)
  return mergeConfig(extendsConfig, config)
}

let cached: Promise<BuildConfig> | null = null

/** find config file and resolve config content based on paths info */
export async function findBuildConfig(): Promise<BuildConfig> {
  if (cached) {
    return cached
  }

  // 若指定了 build config file path，则使用之
  // 否则使用 build root 下的 build config 文件
  const configFilePath = getBuildConfigFilePath() || abs(files.config)
  logger.debug(`use build config file: ${configFilePath}`)

  return cached = readAndResolveConfig(configFilePath).then(
    config => {
      // 若指定了 env variables file path
      // 读取之并覆盖 build config 中的 envVariables 字段
      const envVariablesFilePath = getEnvVariablesFilePath()
      if (envVariablesFilePath) {
        logger.debug(`use env variables file: ${envVariablesFilePath}`)
        const envVariables = readEnvVariables(envVariablesFilePath)
        config.envVariables = envVariables
      }

      const isomorphicToolsFilePath = getIsomorphicToolsFilePath()
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
