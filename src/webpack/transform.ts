import produce from 'immer'
import path from 'path'
import { Configuration, RuleSetConditionAbsolute, RuleSetRule, Chunk } from 'webpack'
import postcssPresetEnv from 'postcss-preset-env'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { Transform } from '../constants/transform'
import {
  BuildConfig, TransformObject, shouldAddGlobalPolyfill,
  AddPolyfill, shouldAddRuntimePolyfill, Optimization
} from '../utils/build-conf'
import { Env, getEnv } from '../utils/build-env'
import chunks from '../constants/chunks'
import logger from '../utils/logger'

// ts-loader 开启 transpileOnly 后会出的 warning
const tsTranspileOnlyWarningPattern = /export .* was not found in/

export interface Condition {
  /** 需要处理的资源 */
  include: string
  /** 需要排除的资源 */
  exclude: string[]
}

/** 添加资源转换逻辑（buildConfig.transforms） */
export function addTransforms(
  /** 当前 webpack 配置 */
  config: Configuration,
  /** 构建配置 build config */
  buildConfig: BuildConfig
): Configuration {
  const transformConfigs = Object.entries(buildConfig.transforms).map(([condition, transform]) => {
    const [extensionValue, contextValue = ''] = condition.split('@')
    const resource: Condition = { include: extensionValue, exclude: [] }
    const context: Condition = { include: contextValue, exclude: [] }
    return { transform, resource, context }
  })

  // 处理 extension / context 冲突的 transform 项
  transformConfigs.forEach(transformConfig => {
    const { resource, context } = transformConfig

    // 若存在其他 extension 比当前 extension 更精确，则在当前项中排除之；
    // 如 css & module.css，则在 css 对应项中排除 module.css
    const extensionValues = transformConfigs.map(({ resource }) => resource.include)
    resource.exclude = extensionValues.filter(
      target => target !== resource.include && endsWithExt(target, resource.include)
    )

    // 若存在其他项 extension 与当前 extension 相同，而 context 更精确，则在当前项中排除之；
    // 如 svg@css & svg@module.css，则在 svg@css 对应项中排除 svg@module.css
    const contextValues = transformConfigs.filter(
      targetConfig => targetConfig.resource.include === resource.include
    ).map(({ context }) => context.include)
    context.exclude = contextValues.filter(
      target => target !== context.include && endsWithExt(target, context.include)
    )
  })

  transformConfigs.forEach(({ transform, resource, context }) => {
    config = addTransform(config, buildConfig, transform, resource, context)
  })

  return config
}

interface TransformStyleConfig {
  modules?: boolean
  options?: unknown
}

type BabelPreset = string | [string, ...unknown[]]
type BabelPlugin = string | [string, ...unknown[]]

// babel-loader options（同 babel options）
type BabelOptions = {
  presets?: BabelPreset[]
  plugins?: BabelPlugin[]
  sourceType?: string
}

type TransformBabelConfig = BabelOptions

type TransformJsxConfig = {
  babelOptions?: BabelOptions
}

type TransformTsConfig = {
  // 默认开发模式跳过类型检查，提高构建效率，另，避免过严的限制
  transpileOnlyWhenDev?: boolean
  babelOptions?: BabelOptions
}

function addTransform(
  /** 当前 webpack 配置 */
  config: Configuration,
  /** 构建配置 build config */
  { targets, optimization }: BuildConfig,
  /** transform 信息 */
  transform: TransformObject,
  /** 资源后缀名条件 */
  resource: Condition,
  /** 上下文资源（引入当前资源的资源）后缀名条件 */
  context: Condition
) {

  // resource.include 当前处理的文件后缀
  const extension = resource.include

  const excludePatterns = resource.exclude.map(makeExtensionPattern)

  // 针对后缀为 js 的 transform，控制范围（不对依赖做转换）
  if (extension === 'js') {
    const jsExcludePattern = makeJsExcludePattern(optimization.transformDeps)
    if (jsExcludePattern != null) excludePatterns.push(jsExcludePattern)
  }

  const resourcePattern = {
    include: makeExtensionPattern(resource.include),
    exclude: excludePatterns
  }

  const contextPattern = {
    include: context.include ? makeExtensionPattern(context.include) : undefined,
    exclude: context.exclude.map(makeExtensionPattern)
  }

  const appendRule = (previousConfig: Configuration, ruleBase: Partial<RuleSetRule>) => produce(previousConfig, (nextConfig: Configuration) => {
    const rule = makeRule(extension, resourcePattern, contextPattern, ruleBase)
    nextConfig.module!.rules!.push(rule)
  })

  const appendRuleWithLoaders = (previousConfig: Configuration, ...loaders: LoaderInfo[]) => (
    appendRule(previousConfig, { use: loaders.map(adaptLoader) })
  )

  const appendRuleWithAssetType = (previousConfig: Configuration, assetType: string) => (
    appendRule(previousConfig, { type: assetType })
  )

  const markDefaultExtension = (previousConfig: Configuration) => {
    return addDefaultExtension(previousConfig, extension)
  }

  switch(transform.transformer) {
    case Transform.Css:
    case Transform.Less: {
      const transformConfig = (transform.config || {}) as TransformStyleConfig
      const loaders: LoaderInfo[] = []

      // // 测试时无需 style-loader
      // if (getEnv() !== Env.Test) {
      //   loaders.push({ loader: 'style-loader' })
      // }

      // TODO: 确认是否需要在测试时干掉
      loaders.push({ loader: MiniCssExtractPlugin.loader })

      loaders.push({
        loader: 'css-loader',
        options: {
          // https://github.com/webpack-contrib/css-loader/issues/228#issuecomment-312885975
          importLoaders: transform.transformer === Transform.Css ? 1 : 0,
          modules: (
            transformConfig.modules
            ? { localIdentName: '[local]_[hash:base64:5]' }
            : false
          )
        }
      })

      loaders.push({ loader: 'postcss-loader', options: {
        postcssOptions: {
          plugins: [
            postcssPresetEnv({
              browsers: targets.browsers.join(', ')
            })
          ]
        }
      }})

      if (transform.transformer === Transform.Less) {
        loaders.push({
          loader: 'less-loader',
          options: {
            lessOptions: transformConfig.options
          }
        })
      }

      return appendRuleWithLoaders(config, ...loaders)
    }

    case Transform.Babel: {
      config = markDefaultExtension(config)
      const transformConfig = (transform.config || {}) as TransformBabelConfig
      return appendRuleWithLoaders(config, {
        loader: 'babel-loader',
        options: makeBabelLoaderOptions(
          transformConfig,
          targets.browsers,
          optimization.addPolyfill
        )
      })
    }

    case Transform.Jsx: {
      config = markDefaultExtension(config)
      const transformConfig = (transform.config || {}) as TransformJsxConfig
      return appendRuleWithLoaders(config, {
        loader: 'babel-loader',
        options: makeBabelLoaderOptions(
          transformConfig.babelOptions || {},
          targets.browsers,
          optimization.addPolyfill,
          true
        )
      })
    }

    case Transform.Ts:
    case Transform.Tsx: {
      config = markDefaultExtension(config)
      const transformConfig: Required<TransformTsConfig> = {
        transpileOnlyWhenDev: true,
        babelOptions: {},
        ...(transform.config as TransformTsConfig)
      }
      const babelOptions = makeBabelLoaderOptions(
        transformConfig.babelOptions,
        targets.browsers,
        optimization.addPolyfill,
        transform.transformer === Transform.Tsx
      )
      const compilerOptions = {
        // 这里设置为 ES2020（最新的规范能力），进一步的转换由 babel 处理
        target: 'ES2020',
        // enable tree-shaking，由 webpack 来做 module 格式的转换
        module: 'ES2015',
        // module 为 ES2015 时，moduleResolution 默认为 Classic，这里设置为 Node
        moduleResolution: 'Node'
      }
      const tsLoaderOptions = {
        transpileOnly: getEnv() === Env.Dev && transformConfig.transpileOnlyWhenDev,
        compilerOptions,
        // 方便项目直接把内部依赖（portal-base / fe-core 等）的源码 link 进来一起构建调试
        allowTsInNodeModules: true
      }
      if (tsLoaderOptions.transpileOnly) {
        // 干掉因为开启 transpileOnly 导致的 warning
        // 详情见 https://github.com/TypeStrong/ts-loader#transpileonly
        config = produce(config, newConfig => {
          newConfig.stats ??= {}
          if (typeof(newConfig.stats) === 'boolean' || typeof(newConfig.stats) === 'string') {
            throw new Error("Expect config.stats to be object.")
          }
          const originFilter = newConfig.stats.warningsFilter ?? []
          const warningsFilter = Array.isArray(originFilter) ? originFilter : [originFilter]
          if (!warningsFilter.includes(tsTranspileOnlyWarningPattern)) {
            logger.debug('append warningsFilter:', tsTranspileOnlyWarningPattern)
            warningsFilter.push(tsTranspileOnlyWarningPattern)
            newConfig.stats.warningsFilter = warningsFilter
          }
        })
      }
      return appendRuleWithLoaders(
        config,
        { loader: 'babel-loader', options: babelOptions },
        // 这边预期 ts-loader 将 ts 代码编成 ES6 代码，然后再交给 babel-loader 处理
        { loader: 'ts-loader', options: tsLoaderOptions }
      )
    }

    case Transform.Raw: {
      return appendRuleWithAssetType(config, 'asset/source')
    }

    case Transform.File: {
      return appendRuleWithAssetType(config, 'asset')
    }

    case Transform.SvgSprite: {
      throw new Error('Transform svg-sprite is not supported any more.')
    }

    case Transform.Svgr: {
      return appendRuleWithLoaders(config, {
        loader: '@svgr/webpack',
        options: {
          // 已知 svgo 的 removeViewBox 会导致指定了 width & height 的 svg 文件的 viewBox 被删掉，
          // 而删掉 viewBox 会导致 svg 不能在外部指定 css 宽高时正确地缩放内容，故这里先把 svgo 干掉
          // TODO: 小心地配置 svgo 对 svg 内容进行优化
          svgo: false
        }
      })
    }

    default: {
      throw new Error(`Invalid transformer: ${transform.transformer}`)
    }
  }
}

function endsWithExt(target: string, ext: string) {
  return target.endsWith(ext ? ('.' + ext) : '')
}

function regexpEscape(s: string) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

function makeExtensionPattern(ext: string) {
  return new RegExp(`\\.${regexpEscape(ext)}\$`)
}

/** 构造处理 Javascript 内容时排除依赖用的正则 */
function makeJsExcludePattern(
  /** 是否排除依赖，或需要被处理（不应该被排除）的依赖包名 */
  transformDeps: boolean | string[]
) {
  if (Array.isArray(transformDeps)) {
    return new RegExp(`node_modules/(?!(${transformDeps.join('|')})/).*`)
  }
  return transformDeps ? null : /node_modules\//
}

export interface LoaderInfo {
  loader: string
  options?: any
}

export interface PatternCondition {
  /** 需要处理的资源 */
  include?: RegExp
  /** 需要排除的资源 */
  exclude: RegExp[]
}

function makeRule(extension: string, resource: PatternCondition, context: PatternCondition, base: Partial<RuleSetRule>): RuleSetRule {
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

function adaptLoader({ loader, options }: LoaderInfo) {
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

function addDefaultExtension(config: Configuration, extension: string) {
  extension = extension && ('.' + extension)
  return produce(config, newConfig => {
    const resolve = newConfig.resolve = newConfig.resolve || {}
    const extensions = resolve.extensions = resolve.extensions || []
    if (!extensions.includes(extension)) {
      extensions.push(extension)
    }
  })
}

// 不支持 preset 简写的形式
function adaptBabelPreset(preset: BabelPreset): BabelPreset {
  if (typeof preset === 'string') {
    return require.resolve(preset)
  }
  const [name, ...options] = preset
  return [require.resolve(name), ...options]
}

// TODO: 添加 babel-plugin- 前缀
function adaptBabelPluginName(name: string) {
  return require.resolve(name)
}

function adaptBabelPlugin(plugin: BabelPlugin): BabelPlugin {
  if (typeof plugin === 'string') {
    return adaptBabelPluginName(plugin)
  }
  const [name, ...options] = plugin
  return [adaptBabelPluginName(name), ...options]
}

type BabelPresetOrPlugin = BabelPreset | BabelPlugin

function includes<T extends BabelPresetOrPlugin>(list: T[], name: string) {
  return list.some(item => {
    const itemName = typeof item === 'string' ? item : item[0]
    return itemName === name
  })
}

const corejsOptions = {
  version: 3,
  proposals: false
}

function getBabelPresetEnvOptions(targets: string[], polyfill: AddPolyfill) {
  return {
    // enable tree-shaking，由 webpack 来做 module 格式的转换
    modules: false,
    targets,
    ...(
      // global polyfill
      shouldAddGlobalPolyfill(polyfill)
      && {
        // https://babeljs.io/docs/en/babel-preset-env#usebuiltins
        useBuiltIns: 'usage',
        corejs: corejsOptions
      }
    )
  }
}

/**
 * 构造 babel-loader 的配置对象，主要是添加默认的 polyfill 相关配置
 * 另外会调整 preset、plugin 的名字为绝对路径
 */
function makeBabelLoaderOptions(
  /** babel options */
  options: TransformBabelConfig,
  /** babel env targets: https://babeljs.io/docs/en/babel-preset-env#targets */
  targets: string[],
  /** polyfill 模式 */
  polyfill: AddPolyfill,
  /** 是否 react 项目 */
  withReact = false
) {
  options = options || {}

  const isDev = getEnv() === Env.Dev

  return produce(options, nextOptions => {
    const presets = nextOptions.presets || []
    const presetEnvName = '@babel/preset-env'
    if (!isDev && !includes(presets, presetEnvName)) {
      presets.unshift([presetEnvName, getBabelPresetEnvOptions(targets, polyfill)])
    }
    const presetReactName = '@babel/preset-react'
    if (withReact && !includes(presets, presetReactName)) {
      presets.push([presetReactName, { development: isDev }])
    }
    nextOptions.presets = presets.map(adaptBabelPreset)

    const plugins = nextOptions.plugins || []
    const pluginTransformRuntimeName = '@babel/plugin-transform-runtime'
    if (!isDev && shouldAddRuntimePolyfill(polyfill) && !includes(plugins, pluginTransformRuntimeName)) {
      plugins.unshift([pluginTransformRuntimeName, { corejs: corejsOptions }])
    }
    const pluginReactRefreshName = 'react-refresh/babel'
    if (withReact && isDev && !includes(plugins, pluginReactRefreshName)) {
      plugins.push(pluginReactRefreshName)
    }
    nextOptions.plugins = plugins.map(adaptBabelPlugin)

    // 用于指定预期模块类型，若用户未指定，则使用默认值 unambiguous，即：自动推断
    nextOptions.sourceType = nextOptions.sourceType || 'unambiguous'
  })
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
        chunks: 'all',
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
      chunks: 'all',
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
