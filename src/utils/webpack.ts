import { produce } from 'immer'
import path from 'path'
import { Configuration, WebpackPluginInstance, Chunk, RuleSetRule, RuleSetConditionAbsolute } from 'webpack'
import chunks from '../constants/chunks'
import { Optimization } from './build-conf'
import { getCachePath } from './paths'
import logger from './logger'

/** 向配置中追加 plugin */
export function appendPlugins(config: Configuration, ...plugins: Array<WebpackPluginInstance | null | undefined>) {
  return produce(config, newConfig => {
    newConfig.plugins = newConfig.plugins || []
    for (const plugin of plugins) {
      if (plugin != null) {
        newConfig.plugins.push(plugin)
      }
    }
  })
}

/** loader 信息 */
export interface LoaderInfo {
  loader: string
  options?: any
}

/** 对 loader 信息进行标准化处理 */
export function adaptLoader({ loader, options }: LoaderInfo): LoaderInfo {
  // 这里先前会把 loader 的值通过 `require.resolve` 替换为绝对路径
  // 目的是为了保证总是能拿到正确的一致的 loader 实现（不受项目本地 node_modules 中 loader 实现的影响）
  const resolvedLoader = require.resolve(loader)
  const loaderObj = { loader: resolvedLoader, options }

  // 添加 builder 后续处理需要的字段，`enumerable: false` 是为了防止 webpack 乱报错
  // 比如 extract-style 处要根据 `__loaderName__ === 'style-loader'` 判断是否需处理
  Object.defineProperty(loaderObj, '__loaderName__', {
    value: loader,
    enumerable: false,
    configurable: true
  })

  return loaderObj
}

const sourcemapParseFailedWarningPattern = /Failed to parse source map from/

/** 配置 source map */
export function processSourceMap(config: Configuration, highQuality: boolean) {
  config = produce(config, (newConfig: Configuration) => {
    // 使用 cheap-module-source-map 而不是 eval-cheap-module-source-map 或 eval-source-map
    // 具体原因见 https://github.com/Front-End-Engineering-Cloud/builder/pull/139#discussion_r676475522
    newConfig.devtool = highQuality ? 'cheap-module-source-map' : 'eval';
    newConfig.module!.rules!.push({
      test: /node_modules\/.*\.js$/,
      enforce: 'pre',
      use: [{
        loader: 'source-map-loader',
        options: {
          filterSourceMappingUrl(_url: string, _resourcePath: string) {
            // highQuality 为 false 时也需要引入 source-map-loader 并在这里返回 remove
            // 来把第三方库代码中的 SourceMappingURL 信息干掉，以避免开发时的 warning
            return highQuality ? 'consume' : 'remove';
          }
        }
      }].map(adaptLoader)
    })
  })
  if (highQuality) {
    // 第三方依赖的 source map 信息残缺导致 parse 失败是很常见的事情，
    // 最常见的原因是生成的 sourcemap 未将源码 inline，而发布的内容里也没有包含源码，
    // 详见 https://www.typescriptlang.org/tsconfig/#inlineSources
    // 这里忽略相关 warning，避免污染浏览器 console
    config = ignoreWarning(config, sourcemapParseFailedWarningPattern)
  }
  return config
}

export interface SplitChunksCacheGroup {
  /**
   * Select chunks for determining cache group content
   * @default 'initial'
   */
  chunks?: 'all' | 'initial' | 'async' | ((chunk: Chunk) => boolean)
  /**
   * Minimum number of times a module has to be duplicated until it's considered for splitting.
   * @default 1
   */
  minChunks?: number
  /**
   * Give chunks for this cache group a name (chunks with equal name are merged).
   */
  name?: string
  /**
   * Priority of this cache group.
   * @default -20
   */
  priority?: number
  /**
   * Assign modules to a cache group by module name.
   */
  test?: string | Function | RegExp
}

export type SplitChunksCacheGroups = { [key: string]: SplitChunksCacheGroup }

/** 解析 optimization 配置，获取 chunks 及 cacheGroups */
export function parseOptimizationConfig(optimization: Optimization): {
  baseChunks: string[]
  cacheGroups: SplitChunksCacheGroups
} {
  const { extractVendor, extractCommon } = optimization
  const baseChunks: string[] = []
  const cacheGroups: SplitChunksCacheGroups = {}

  if (extractVendor) {
    if (typeof extractVendor === 'string') {
      throw new Error('BREAKING CHANGE: extractVendor 已不再支持该用法，使用方式请参考帮助文档！')
    } else if (typeof extractVendor === 'boolean' || extractVendor.length > 0) {
      baseChunks.push(chunks.vendor)

      cacheGroups[chunks.vendor] = {
        name: chunks.vendor,
        chunks: 'initial',
        priority: -10,
        test: function(module: { resource?: string }): boolean {
          const resource = module.resource
          if (!resource) return false

          const nodeModulesPath = path.join(path.sep, 'node_modules', path.sep)
          if (typeof extractVendor === 'boolean') {
            return resource.includes(nodeModulesPath)
          }

          return extractVendor.some(packageName => {
            return resource.includes(path.join(nodeModulesPath, packageName, path.sep))
          })
        }
      }
    }
  }

  if (extractCommon) {
    baseChunks.push(chunks.common)
    cacheGroups[chunks.common] = {
      name: chunks.common,
      chunks: 'initial',
      minChunks: 2,
      priority: -20
    }
  }

  return { baseChunks, cacheGroups }
}

/** 向配置中追加 cacheGroup 项 */
export function appendCacheGroups(
  config: Configuration, cacheGroups: SplitChunksCacheGroups
): Configuration {
  return produce(config, newConfig => {
    newConfig.optimization ||= {}
    newConfig.optimization.splitChunks ||= {}
    newConfig.optimization.splitChunks.cacheGroups ||= {}

    Object.assign(newConfig.optimization.splitChunks.cacheGroups, cacheGroups)
  })
}

export interface PatternCondition {
  /** 需要处理的资源 */
  include?: RegExp
  /** 需要排除的资源 */
  exclude: RegExp[]
}

/** 构造 rule */
export function makeRule(extension: string, resource: PatternCondition, context: PatternCondition, base: Partial<RuleSetRule>): RuleSetRule {
  const issuerConditions: RuleSetConditionAbsolute[] = []
  if (context.include != null) issuerConditions.push(context.include)
  if (context.exclude.length > 0) issuerConditions.push({ not: context.exclude })

  const rule: RuleSetRule = {
    ...base,
    test: resource.include,
    exclude: resource.exclude,
    issuer: issuerConditions.length > 0 ? { and: issuerConditions } : undefined
  }

  // 添加 builder 后续处理需要的字段，`enumerable: false` 是为了防止 webpack 乱报错
  Object.defineProperty(rule, '__extension__', {
    value: extension,
    enumerable: false,
    configurable: true
  })

  return rule
}

/** 添加默认文件后缀名 */
export function addDefaultExtension(config: Configuration, extension: string) {
  extension = extension && ('.' + extension)
  return produce(config, newConfig => {
    const resolve = newConfig.resolve = newConfig.resolve || {}
    const extensions = resolve.extensions = resolve.extensions || []
    if (!extensions.includes(extension)) {
      extensions.push(extension)
    }
  })
}

/** 开启文件缓存 */
export function enableFilesystemCache(config: Configuration): Configuration {
  return produce(config, newConfig => {
    newConfig.cache = {
      type: 'filesystem',
      cacheDirectory: getCachePath()
    }
  })
}

/** 指定 pattern 忽略 warning */
export function ignoreWarning(config: Configuration, pattern: RegExp): Configuration {
  return produce(config, newConfig => {
    newConfig.ignoreWarnings ??= []
    if (!newConfig.ignoreWarnings.includes(pattern)) {
      logger.debug('append warningsFilter:', pattern)
      newConfig.ignoreWarnings.push(pattern)
    }
  })
}
