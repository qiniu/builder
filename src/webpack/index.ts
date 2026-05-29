import { mapValues } from 'lodash'
import produce from 'immer'
import fs from 'fs'
import path from 'path'
import type { rspack as Rspack, RspackOptions } from '@rspack/core'
import HtmlPlugin from 'html-webpack-plugin'
import { loadRspackCore, loadReactRefreshPlugin } from '../utils/rspack-esm'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { createWebpackBarRspackPlugin } from './webpackbar-rspack'
import { ImageMinimizerPlugin } from '@rsbuild/plugin-image-compress'
import { getBuildRoot, abs, getStaticPath, getDistPath, getSrcPath } from '../utils/paths'
import { BuildConfig, findBuildConfig, getNeedAnalyze } from '../utils/build-conf'
import { addTransforms } from './transform'
import { Env, getEnv } from '../utils/build-env'
import logger from '../utils/logger'
import { getPathFromUrl, getPageFilename } from '../utils'
import { appendPlugins, processSourceMapForDevServer, appendCacheGroups, parseOptimizationConfig, enableFilesystemCache } from '../utils/webpack'

const dirnameOfBuilder = path.resolve(__dirname, '../..')
const nodeModulesOfBuilder = path.resolve(dirnameOfBuilder, 'node_modules')

/** 获取 rspack 配置（构建用） */
export async function getConfig(): Promise<RspackOptions> {
  const { rspack } = await loadRspackCore()
  const buildConfig = await findBuildConfig()
  const isProd = getEnv() === Env.Prod
  const isDev = getEnv() === Env.Dev

  const resolveAlias = mapValues(
    buildConfig.resolve.alias,
    path => abs(path)
  )

  let config: RspackOptions = {
    target: 'web', // TODO: 使用 `browserslist:...` 可能合适? 详情见 https://rspack.rs/config/
    mode: getMode(),
    context: getBuildRoot(),
    resolve: {
      // 同默认配置，这里写出来是因为后续会有新增 extensions
      extensions: ['.wasm', '.mjs', '.js', '.json'],
      modules: [
        getSrcPath(buildConfig),
        'node_modules',
        nodeModulesOfBuilder,
        abs('node_modules')
      ],
      alias: resolveAlias
    },
    resolveLoader: {
      modules: [
        'node_modules',
        nodeModulesOfBuilder
      ]
    },
    entry: mapValues(buildConfig.entries, entryFile => abs(entryFile)),
    module: {
      rules: [],
      // Rspack 2 默认严格校验 ESM 导出；TS 类型再导出、decorator metadata 等会误报
      // https://rspack.rs/config/module-parser#parserjavascript
      parser: {
        javascript: {
          typeReexportsPresence: 'tolerant-no-check',
          exportsPresence: 'warn',
          importExportsPresence: 'warn',
          reexportExportsPresence: 'warn'
        }
      }
    },
    plugins: [],
    output: {
      path: getDistPath(buildConfig),
      filename: 'static/[name]-[contenthash].js',
      chunkFilename: 'static/[id]-[chunkhash].js',
      assetModuleFilename: 'static/[name]-[contenthash][ext]',
      publicPath: buildConfig.publicUrl,
      environment: {
        // 这里控制 rspack 本身的运行时代码（而不是业务代码），
        // 在生产环境，对于语言 feature 先全部配置不支持，以确保 rspack 会产出兼容性最好的代码；
        // TODO: 后续考虑通过使用 build config 中的 targets.browsers 来挨个判断是否支持
        arrowFunction: isDev,
        bigIntLiteral: isDev,
        const: false,
        destructuring: isDev,
        dynamicImport: isDev,
        forOf: isDev,
        module: isDev
      }
    },
    optimization: {
      minimizer: [
        '...',
        new rspack.LightningCssMinimizerRspackPlugin()
      ]
    },
    // style-loader / css-loader 与 Rspack 原生 CSS 实验特性不兼容
    // https://rspack.rs/guide/tech/css#using-style-loader
    experiments: {
      css: false
    },
    devtool: false
  }

  let baseChunks: string[] = []

  if (isProd) {
    const result = parseOptimizationConfig(buildConfig.optimization)
    baseChunks = result.baseChunks
    config = appendCacheGroups(config, result.cacheGroups)
  }

  config = addTransforms(config, buildConfig, rspack)

  const htmlPlugins = Object.entries(buildConfig.pages).map(([ name, { template, entries } ]) => {
    return new HtmlPlugin({
      template: abs(template),
      filename: getPageFilename(name),
      chunks: [...baseChunks, ...entries],
      chunksSortMode: 'manual'
    })
  })

  const definePlugin = new rspack.DefinePlugin(
    // DefinePlugin 只是简单的文本替换，这里进行 JSON stringify 转换
    mapValues({
      'process.env.NODE_ENV': getEnv(),
      ...buildConfig.envVariables
    }, JSON.stringify)
  )

  const staticDirCopyPlugin = getStaticDirCopyPlugin(buildConfig, rspack)

  config = appendPlugins(
    config,
    ...htmlPlugins,
    definePlugin,
    staticDirCopyPlugin,
    createWebpackBarRspackPlugin(rspack, { color: 'green' })
  )

  if (isProd) {
    config = appendPlugins(config, new rspack.CssExtractRspackPlugin({
      filename: 'static/[name]-[contenthash].css',
      chunkFilename: 'static/[id]-[chunkhash].css'
    }))
  }

  if (getNeedAnalyze()) {
    config = appendPlugins(config, new BundleAnalyzerPlugin())
  }

  if (isProd && buildConfig.optimization.compressImage) {
    config = appendPlugins(
      config,
      new ImageMinimizerPlugin({
        use: 'jpeg',
        test: /\.(?:jpg|jpeg|jpe)$/i,
        quality: 65
      }),
      new ImageMinimizerPlugin({
        use: 'svg',
        test: /\.svg$/i
      })
      // 这里先不做 png 的压缩，因为 png 压缩有可能会产生负优化（结果文件比源文件体积大）
    )
  }

  if (isDev) {
    // 开发环境忽略 ESM 链接 warning（类型再导出、emitDecoratorMetadata 等）
    // config = ignoreWarning(config, /ESModulesLinking/)
  }

  return config
}

/** 获取用于 dev server 的 rspack 配置（但不含对 dev server 本身的配置）*/
export async function getConfigForDevServer() {

  let config = await getConfig()
  const buildConfig = await findBuildConfig()
  const { filesystemCache, highQualitySourceMap } = buildConfig.optimization
  const isDev = getEnv() === Env.Dev

  // 只保留 publicPath 中的 path，确保静态资源请求与页面走相同的 host（即本地 dev server）
  config = produce(config, newConfig => {
    newConfig.output!.publicPath = getPathFromUrl(buildConfig.publicUrl)
    // 降低 dev server 基础设施日志（如每次编译成功的 info）
    newConfig.infrastructureLogging = {
      ...newConfig.infrastructureLogging,
      level: 'error'
    }
  })

  if (isDev && filesystemCache) {
    config = enableFilesystemCache(config)
  }

  if (isDev) {
    config = processSourceMapForDevServer(config, highQualitySourceMap)
  }

  if (isDev) {
    const ReactRefreshRspackPlugin = await loadReactRefreshPlugin()
    config = appendPlugins(config, new ReactRefreshRspackPlugin())
  }

  return config
}

/** 获取合适的 rspack mode */
function getMode(): RspackOptions['mode'] {
  const buildEnv = getEnv()
  if (buildEnv === Env.Dev) return 'development'
  if (buildEnv === Env.Prod) return 'production'
  return 'none'
}

/** 构造用于 static 目录复制的 plugin 实例 */
function getStaticDirCopyPlugin(buildConfig: BuildConfig, rspack: typeof Rspack) {
  const staticPath = getStaticPath(buildConfig)
  if (!fs.existsSync(staticPath)) return null
  try {
    const stats = fs.statSync(staticPath)
    if (!stats.isDirectory()) {
      throw new Error('staticPath not a directory')
    }

    return new rspack.CopyRspackPlugin({
      patterns: [{ from: staticPath, to: 'static', toType: 'dir' }]
    })
  } catch (e: unknown) {
    logger.warn('Copy staticDir content failed:', e && (e as any).message)
  }
}
