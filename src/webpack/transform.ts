import produce from 'immer'
import { Configuration, RuleSetRule } from 'webpack'
import postcssPresetEnv from 'postcss-preset-env'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { Transform } from '../constants/transform'
import { getSvgoConfigForSvgr } from '../utils/svgo'
import {
  BuildConfig, TransformObject, shouldAddGlobalPolyfill,
  AddPolyfill, shouldAddRuntimePolyfill
} from '../utils/build-conf'
import { Env, getEnv } from '../utils/build-env'
import { LoaderInfo, adaptLoader, makeRule, addDefaultExtension, ignoreWarning } from '../utils/webpack'
import { abs } from '../utils/paths'

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
  // 是否使用项目里的 typescript 库进行类型检查和编译
  useProjectTypeScript?: boolean
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
    include: makeExtensionPattern(extension),
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

      if (getEnv() === Env.Dev) {
        loaders.push({ loader: 'style-loader' })
      } else if (getEnv() === Env.Prod) {
        // dev 环境不能用 MiniCssExtractPlugin.loader
        // 已知 less with css-module 的项目，样式 hot reload 会有问题
        loaders.push({ loader: MiniCssExtractPlugin.loader })
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
        useProjectTypeScript: false,
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
        // 这里设置为 ES2020（最新的规范能力），需要注意的是，这里设置 ESNext 可能是不合适的：
        // 
        // > The special ESNext value refers to the highest version your version of TypeScript supports. This setting should be used with caution, 
        // > since it doesn’t mean the same thing between different TypeScript versions and can make upgrades less predictable.
        // > - https://www.typescriptlang.org/tsconfig#target
        // 
        // 这里 Typescript 处理的结果会交给 babel 处理；我们默认使用 @babel/preset-env，预期会支持最新的规范能力
        // 然而我们使用的 Typescript 跟 babel (& @babel/preset-env) 行为之间可能会有 gap：
        // 以 babel-plugin-proposal-class-properties 为例，在对应的 proposal 进入 stage 4 后，
        // Typescript 会认为以 ESNext 为目标时，对应的语法不再需要转换；
        // 而如果 builder 此时依赖了相对更新的 Typescript 版本，以及相对较旧的 babel (& @babel/preset-env) 版本
        // 那么这里对 class properties 语法的支持就会有问题（Typescript & babel 都不会对它进行转换）
        target: 'ES2020',
        // 跟 target 保持一致，而不是设置为 CommonJS；由 webpack 来做 module 格式的转换以 enable tree shaking
        module: 'ES2020',
        // module 为 ES2020 时，moduleResolution 默认为 Classic（虽然 TS 文档不是这么说的），这里明确指定为 Node
        moduleResolution: 'Node'
      }
      const tsLoaderOptions = {
        transpileOnly: getEnv() === Env.Dev && transformConfig.transpileOnlyWhenDev,
        compilerOptions,
        // 方便项目直接把内部依赖（portal-base / fe-core 等）的源码 link 进来一起构建调试
        allowTsInNodeModules: true,
        compiler: transformConfig.useProjectTypeScript ?
          require.resolve('typescript', {
            paths: [abs('node_modules')]
          }) :
          'typescript'
      }
      if (tsLoaderOptions.transpileOnly) {
        // 干掉因为开启 transpileOnly 导致的 warning
        // 详情见 https://github.com/TypeStrong/ts-loader#transpileonly
        config = ignoreWarning(config, tsTranspileOnlyWarningPattern)
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

      const shouldCompressSvg = getEnv() === Env.Prod && optimization.compressImage
      const svgoConfig = getSvgoConfigForSvgr(shouldCompressSvg)

      return appendRuleWithLoaders(config, {
        loader: '@svgr/webpack',
        options: { svgo: true, svgoConfig }
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
