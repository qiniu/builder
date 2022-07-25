import produce from 'immer'
import { Configuration } from 'webpack'
import {
  shouldAddGlobalPolyfill, AddPolyfill, shouldAddRuntimePolyfill, BuildConfig, TransformObject
} from '../utils/build-conf'
import { Env, getEnv } from '../utils/build-env'
import { ignoreWarning, LoaderInfo } from '../utils/webpack'
import { abs } from '../utils/paths'


type BabelPreset = string | [string, ...unknown[]]
type BabelPlugin = string | [string, ...unknown[]]

// babel-loader options（同 babel options）
type BabelOptions = {
  presets?: BabelPreset[]
  plugins?: BabelPlugin[]
  sourceType?: string
}

export type TransformBabelConfig = BabelOptions

export type TransformBabelJsxConfig = {
  babelOptions?: BabelOptions
}

type TransformTsConfig = {
  // 默认开发模式跳过类型检查，提高构建效率，另，避免过严的限制
  transpileOnlyWhenDev?: boolean
  babelOptions?: BabelOptions
  // 是否使用项目里的 typescript 库进行类型检查和编译
  useProjectTypeScript?: boolean
}

// ts-loader 开启 transpileOnly 后会出的 warning
const tsTranspileOnlyWarningPattern = /export .* was not found in/

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
 export function makeBabelLoaderOptions(
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

export function addBabelTsTransform(
  /** 当前 webpack 配置 */
  config: Configuration,
  /** 构建配置 build config */
  { targets, optimization }: BuildConfig,
  /** transform 信息 */
  transform: TransformObject,
  /** 是否 react 项目 */
  withReact: boolean,
  appendRuleWithLoaders: (previousConfig: Configuration, ...loaders: LoaderInfo[]) => Configuration
) {
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
    withReact
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
