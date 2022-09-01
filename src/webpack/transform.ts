import produce from 'immer'
import { Configuration, RuleSetRule } from 'webpack'
import postcssPresetEnv from 'postcss-preset-env'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { isEmpty } from 'lodash'
import { Transform } from '../constants/transform'
import { getSvgoConfigForSvgr } from '../utils/svgo'
import { BuildConfig, TransformObject } from '../utils/build-conf'
import { Env, getEnv } from '../utils/build-env'
import { LoaderInfo, adaptLoader, makeRule, addDefaultExtension } from '../utils/webpack'
import { addBabelTsTransform, makeBabelLoaderOptions, TransformBabelConfig } from './babel'
import { makeSwcLoaderOptions } from './swc'
import logger from '../utils/logger'

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

function addTransform(
  /** 当前 webpack 配置 */
  config: Configuration,
  /** 构建配置 build config */
  buildConfig: BuildConfig,
  /** transform 信息 */
  transform: TransformObject,
  /** 资源后缀名条件 */
  resource: Condition,
  /** 上下文资源（引入当前资源的资源）后缀名条件 */
  context: Condition
) {
  const { targets, optimization } = buildConfig

  // resource.include 当前处理的文件后缀
  const extension = resource.include

  const excludePatterns = resource.exclude.map(makeExtensionPattern)
  const babelOptions = (transform.config as any)?.babelOptions || {}
  if (optimization.swc && !isEmpty(babelOptions)) {
    logger.warn('Babel Options is not supported with swc enabled. Now switch to Babel.')
  }

  const swcEnabled = optimization.swc && isEmpty(babelOptions)

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

      if (swcEnabled) {
        return appendRuleWithLoaders(config, {
          loader: 'swc-loader',
          options: makeSwcLoaderOptions(targets.browsers, optimization.addPolyfill, true)
        })
      }

      return appendRuleWithLoaders(config, {
        loader: 'babel-loader',
        options: makeBabelLoaderOptions(
          babelOptions,
          targets.browsers,
          optimization.addPolyfill,
          true
        )
      })
    }

    case Transform.Ts:
    case Transform.Tsx: {
      config = markDefaultExtension(config)
      const withReact = transform.transformer === Transform.Tsx

      if (swcEnabled) {
        return appendRuleWithLoaders(config, {
          loader: 'swc-loader',
          options: makeSwcLoaderOptions(targets.browsers, optimization.addPolyfill, withReact, true)
        })
      }

      return addBabelTsTransform(config, buildConfig, transform, withReact, appendRuleWithLoaders)
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
