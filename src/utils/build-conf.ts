import { mapValues } from 'lodash'
import fs from 'fs'
import path from 'path'
import files from '../constants/files'
import { extend, watchFile } from '.'
import { getBuildConfigFilePath, abs } from './paths'
import logger from './logger'
import { Transform } from '../constants/transform'

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

export enum PolyfillType {
  /** 在全局环境做 polyfill，适合应用 */
  Global = 'global',
  /** 在运行的上下文做 polyfill，不污染全局，适合工具类库 */
  Runtime = 'runtime'
}

export type AddPolyfill = boolean | PolyfillType

export function shouldAddPolyfill(value: AddPolyfill) {
  return !!value
}

export function shouldAddGlobalPolyfill(value: AddPolyfill) {
  return value === true || value === PolyfillType.Global
}

export function shouldAddRuntimePolyfill(value: AddPolyfill) {
  return value === PolyfillType.Runtime
}

export interface Optimization {
  /** 是否抽取 entries 间的公共内容到单独的文件中 */
  extractCommon: boolean
  /** 抽取固定依赖行为 */
  extractVendor: boolean | string[]
  /** 是否压缩图片 */
  compressImage: boolean
  /** 是否对第三方依赖包的 Javascript 内容进行转换 */
  transformDeps: boolean | string[]
  /** 是否开启自动 polyfill 功能，以及开启何种形式的 polyfill */
  addPolyfill: AddPolyfill
  /** 是否提供高质量的 source map */
  highQualitySourceMap: boolean
}

export interface EnvVariables {
  [key: string]: unknown
}

export type Entries = Record<string, string>

export interface PageInput {
  template: string
  entries: string | string[]
  path: string
}

export interface Page extends PageInput {
  entries: string[]
}

export type PagesInput = Record<string, PageInput>

export type Pages = Record<string, Page>

export interface TransformObject {
  transformer: Transform
  config?: unknown
}

export type TransformsInput = Record<string, Transform | TransformObject>

export type Transforms = Record<string, TransformObject>

export type DevProxy = Record<string, string>

export interface QiniuDeploy {
  target: 'qiniu'
  config: {
    accessKey: string
    secretKey: string
    bucket: string
  }
}

export type Deploy = QiniuDeploy

export interface Targets {
  browsers: string[]
}

export interface BuildConfigInput {
  /** target config to extend */
  extends?: string
  publicUrl?: string
  srcDir?: string
  staticDir?: string
  distDir?: string
  entries?: Entries
  pages?: PagesInput
  transforms?: TransformsInput
  /** 注入到代码中的环境变量 */
  envVariables?: EnvVariables,
  optimization?: Optimization
  devProxy?: DevProxy
  deploy?: Deploy
  targets?: Targets
  test?: TestConfig
  engines?: Engines
}

export interface BuildConfig extends Required<BuildConfigInput> {
  pages: Pages
  transforms: Transforms
}

/** merge two config content */
function mergeConfig(cfg1: BuildConfigInput, cfg2: BuildConfigInput): BuildConfigInput {
  return extend(cfg1, cfg2, {
    transforms: extend(cfg1.transforms, cfg2.transforms) as TransformsInput,
    envVariables: extend(cfg1.envVariables, cfg2.envVariables),
    optimization: extend(cfg1.optimization, cfg2.optimization) as Optimization,
    test: extend(cfg1.test, cfg2.test) as TestConfig,
    engines: extend(cfg1.engines, cfg2.engines) as Engines
  })
}

/** parse config content */
const parseConfig = (cnt: string) => JSON.parse(cnt) as BuildConfigInput

/** read and parse config content */
const readConfig = (configFilePath: string) => {
  const configFileRawContent = fs.readFileSync(configFilePath, { encoding: 'utf8' })
  const configFileContent = parseConfig(configFileRawContent)
  return configFileContent
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
): Promise<BuildConfigInput> {
  const configFilePath = await lookupExtendsTarget(name, sourceConfigFilePath)
  return readAndResolveConfig(configFilePath)
}

/** resolve config content by recursively get and merge config to `extends` */
async function readAndResolveConfig(
  /** path of given config */
  configFilePath: string
): Promise<BuildConfigInput> {
  const config = readConfig(configFilePath)
  const extendsTarget = config.hasOwnProperty('extends') ? config['extends'] : 'default'
  if (!extendsTarget) {
    return Promise.resolve(config)
  }
  const extendsConfig = await getExtendsTarget(extendsTarget, configFilePath)
  return mergeConfig(extendsConfig, config)
}

function normalizePage({ template, entries: _entries, path }: PageInput): Page {
  const entries = typeof _entries === 'string' ? [_entries] : _entries
  return { template, path, entries }
}

function normalizePages(input: PagesInput): Pages {
  return mapValues(input, normalizePage)
}

function normalizeTransforms(input: TransformsInput): Transforms {
  return mapValues(input, value => (
    typeof value === 'string'
    ? { transformer: value }
    : value
  ))
}

function normalizeConfig({
  extends: _extends, publicUrl: _publicUrl, srcDir, staticDir, distDir, entries, pages: _pages,
  transforms: _transforms, envVariables, optimization, devProxy,
  deploy, targets, test, engines
}: BuildConfigInput): BuildConfig {
  if (_extends == null) throw new Error('Invalid value of field extends')
  if (_publicUrl == null) throw new Error('Invalid value of field publicUrl')
  if (srcDir == null) throw new Error('Invalid value of field srcDir')
  if (staticDir == null) throw new Error('Invalid value of field staticDir')
  if (distDir == null) throw new Error('Invalid value of field distDir')
  if (entries == null) throw new Error('Invalid value of field entries')
  if (_pages == null) throw new Error('Invalid value of field pages')
  if (_transforms == null) throw new Error('Invalid value of field transforms')
  if (envVariables == null) throw new Error('Invalid value of field envVariables')
  if (optimization == null) throw new Error('Invalid value of field optimization')
  if (devProxy == null) throw new Error('Invalid value of field devProxy')
  if (deploy == null) throw new Error('Invalid value of field deploy')
  if (targets == null) throw new Error('Invalid value of field targets')
  if (test == null) throw new Error('Invalid value of field test')
  if (engines == null) throw new Error('Invalid value of field engines')
  const publicUrl = _publicUrl.replace(/\/?$/, '/')
  const pages = normalizePages(_pages)
  const transforms = normalizeTransforms(_transforms)
  return {
    extends: _extends, publicUrl, srcDir, staticDir, distDir, entries, pages,
    transforms, envVariables, optimization, devProxy,
    deploy, targets, test, engines
  }
}

/** 获取最终使用的 build config 文件路径 */
function resolveBuildConfigFilePath() {
  // 若指定了 build config file path，则使用之
  // 否则使用 build root 下的 build config 文件
  return getBuildConfigFilePath() || abs(files.config)
}

let cached: Promise<BuildConfig> | null = null

/** find config file and resolve config content based on paths info */
export async function findBuildConfig(disableCache = false): Promise<BuildConfig> {
  if (cached && !disableCache) {
    return cached
  }

  const configFilePath = resolveBuildConfigFilePath()
  logger.debug(`use build config file: ${configFilePath}`)

  return cached = readAndResolveConfig(configFilePath).then(
    config => {
      const normalized = normalizeConfig(config)

      logger.debug('result build config:')
      logger.debug(normalized)
      return normalized
    }
  )
}

let needAnalyze = false

/** Whether analyze bundle */
export function getNeedAnalyze() {
  return needAnalyze
}

export function setNeedAnalyze(value: boolean) {
  needAnalyze = value
}

/** watch build config, call listener when build config changes */
export function watchBuildConfig(listener: (config: BuildConfig) => void) {
  const configFilePath = resolveBuildConfigFilePath()
  logger.debug(`watch build config file: ${configFilePath}`)
  return watchFile(configFilePath, async () => {
    const buildConfig = await findBuildConfig(true) // 把 build config 缓存刷掉
    listener(buildConfig)
  })
}
