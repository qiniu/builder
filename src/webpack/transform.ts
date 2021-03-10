import produce from 'immer'
import { Configuration, RuleSetConditionAbsolute, RuleSetRule } from 'webpack'
import * as postcssPresetEnv from 'postcss-preset-env'
import { Transform } from '../constants/transform'
import { BuildConfig, TransformObject, shouldAddGlobalPolyfill, AddPolyfill } from '../utils/build-conf'
import { Env, getEnv } from '../utils/build-env'

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

// 同 raw-loader options
type TransformRawConfig = unknown

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

  const appendRuleWithLoaders = (previousConfig: Configuration, ...loaders: LoaderInfo[]) => {
    const rule = makeRule(loaders, resource.include, resourcePattern, contextPattern)
    return produce(previousConfig, (nextConfig: Configuration) => {
      nextConfig.module!.rules!.push(rule)
    })
  }

  const markDefaultExtension = (previousConfig: Configuration) => {
    return addDefaultExtension(previousConfig, extension)
  }

  switch(transform.transformer) {
    case Transform.Css:
    case Transform.Less: {
      const transformConfig = (transform.config || {}) as TransformStyleConfig
      const loaders: LoaderInfo[] = []

      // 测试时无需 style-loader
      if (getEnv() !== Env.Test) {
        loaders.push({ loader: 'style-loader' })
      }

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
      const tsLoaderOptions = {
        // TODO: 看下构建性能，是不是需要开 transpileOnly
        // transpileOnly: getEnv() === Env.Dev && transformConfig.transpileOnlyWhenDev,
        // TODO: 是不是通过 compilerOptions 覆盖一些本地 tsconfig.json 的配置？
        // compilerOptions: {}
        // 方便项目直接把内部依赖（portal-base / fe-core 等）的源码 link 进来一起构建调试
        allowTsInNodeModules: true
      }
      return appendRuleWithLoaders(
        config,
        { loader: 'babel-loader', options: babelOptions },
        // 这边预期 ts-loader 将 ts 代码编成 ES6 代码，然后再交给 babel-loader 处理
        { loader: 'ts-loader', options: tsLoaderOptions }
      )
    }

    case Transform.Raw: {
      const transformConfig = transform.config as TransformRawConfig
      return appendRuleWithLoaders(config, {
        loader: 'raw-loader',
        options: transformConfig
      })
    }

    case Transform.File: {
      return appendRuleWithLoaders(config, {
        loader: 'file-loader',
        options: { name: 'static/[name]-[hash].[ext]' }
      })
    }

    case Transform.SvgSprite: {
      throw new Error('Transform svg-sprite is not supported any more.')
    }

    case Transform.Svgr: {
      return appendRuleWithLoaders(config, { loader: '@svgr/webpack' })
      return config
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

function makeRule(loaderList: LoaderInfo[], extension: string, resource: PatternCondition, context: PatternCondition) {
  const issuerConditions: RuleSetConditionAbsolute[] = []
  if (context.include != null) issuerConditions.push(context.include)
  if (context.exclude.length > 0) issuerConditions.push({ not: context.exclude })

  const rule: RuleSetRule = {
    test: resource.include,
    exclude: resource.exclude,
    issuer: issuerConditions.length > 0 ? { and: issuerConditions } : undefined,
    use: loaderList.map(adaptLoader)
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
    if (!includes(plugins, pluginTransformRuntimeName)) {
      plugins.unshift([pluginTransformRuntimeName, { corejs: corejsOptions }])
    }
    const pluginReactRefreshName = 'react-refresh/babel'
    if (withReact && isDev && !includes(plugins, pluginReactRefreshName)) {
      plugins.push('react-refresh/babel')
    }
    nextOptions.plugins = plugins.map(adaptBabelPlugin)

    // 用于指定预期模块类型，若用户未指定，则使用默认值 unambiguous，即：自动推断
    nextOptions.sourceType = nextOptions.sourceType || 'unambiguous'
  })
}
