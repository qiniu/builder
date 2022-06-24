import { mapValues } from 'lodash'
import produce from 'immer'
import fs from 'fs'
import path from 'path'
import { Configuration, DefinePlugin } from 'webpack'
import HtmlPlugin from 'html-webpack-plugin'
import CopyPlugin from 'copy-webpack-plugin'
import ReactFastRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import WebpackBarPlugin from 'webpackbar'
import ImageMinimizerPlugin from 'image-minimizer-webpack-plugin'
import { getBuildRoot, abs, getStaticPath, getDistPath, getSrcPath } from '../utils/paths'
import { BuildConfig, findBuildConfig, getNeedAnalyze } from '../utils/build-conf'
import { addTransforms } from './transform'
import { Env, getEnv } from '../utils/build-env'
import logger from '../utils/logger'
import { getPathFromUrl, getPageFilename } from '../utils'
import { appendPlugins, processSourceMapForDevServer, appendCacheGroups, parseOptimizationConfig, enableFilesystemCache } from '../utils/webpack'
import { svgoConfigForImagemin } from '../utils/svgo'

const dirnameOfBuilder = path.resolve(__dirname, '../..')
export const nodeModulesOfBuilder = path.resolve(dirnameOfBuilder, 'node_modules')

/** 获取 webpack 配置（构建用） */
export async function getConfig(): Promise<Configuration> {
  const buildConfig = await findBuildConfig()
  const isProd = getEnv() === Env.Prod
  const isDev = getEnv() === Env.Dev

  const resolveAlias = mapValues(
    buildConfig.resolve.alias,
    path => abs(path)
  )

  let config: Configuration = {
    target: 'web', // TODO: 使用 `browserslist:...` 可能合适? 详情见 https://webpack.js.org/configuration/target/
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
    module: { rules: [] },
    plugins: [],
    output: {
      path: getDistPath(buildConfig),
      filename: 'static/[name]-[contenthash].js',
      chunkFilename: 'static/[id]-[chunkhash].js',
      assetModuleFilename: 'static/[name]-[contenthash][ext]',
      publicPath: buildConfig.publicUrl,
      environment: {
        // 这里控制 webpack 本身的运行时代码（而不是业务代码），
        // 在生产环境，对于语言 feature 先全部配置不支持，以确保 webpack 会产出兼容性最好的代码；
        // TODO: 后续考虑通过使用 build config 中的 targets.browsers 来挨个判断是否支持
        arrowFunction: isDev,
        bigIntLiteral: isDev,
        // 当前版本的 webpack（v5.52.0）对 const 的使用有点问题，这里如果开启 const，开发环境会报错误：
        // > cannot access '__webpack_default_export__' before initialization
        // 预期后边的 webpack 版本会修复这个问题，这里先关掉；升级 webpack 后 check 下这里，再打开
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
        new CssMinimizerPlugin()
      ]
    },
    devtool: false
  }

  let baseChunks: string[] = []

  if (isProd) {
    const result = parseOptimizationConfig(buildConfig.optimization)
    baseChunks = result.baseChunks
    config = appendCacheGroups(config, result.cacheGroups)
  }

  config = addTransforms(config, buildConfig)

  const htmlPlugins = Object.entries(buildConfig.pages).map(([ name, { template, entries } ]) => {
    return new HtmlPlugin({
      template: abs(template),
      filename: getPageFilename(name),
      chunks: [...baseChunks, ...entries],
      chunksSortMode: 'manual'
    })
  })

  const definePlugin = new DefinePlugin(
    // webpack DefinePlugin 只是简单的文本替换，这里进行 JSON stringify 转换
    mapValues({
      'process.env.NODE_ENV': getEnv(),
      ...buildConfig.envVariables
    }, JSON.stringify)
  )

  const staticDirCopyPlugin = getStaticDirCopyPlugin(buildConfig)

  config = appendPlugins(
    config,
    ...htmlPlugins,
    definePlugin,
    staticDirCopyPlugin,
    new WebpackBarPlugin({ color: 'green' })
  )

  if (isProd) {
    config = appendPlugins(config, new MiniCssExtractPlugin({
      filename: 'static/[name]-[contenthash].css',
      chunkFilename: 'static/[id]-[chunkhash].css'
    }))
  }

  if (getNeedAnalyze()) {
    config = appendPlugins(config, new BundleAnalyzerPlugin())
  }

  if (isProd && buildConfig.optimization.compressImage) {
    config = appendPlugins(config, new ImageMinimizerPlugin({
      minimizerOptions: {
        plugins: [
          ['mozjpeg', { progressive: true, quality: 65 }],
          ['gifsicle', { interlaced: false }],
          ['svgo', svgoConfigForImagemin]
          // 这里先不做 png 的压缩，因为 imagemin-pngquant 有可能会产生负优化（结果文件比源文件体积大），
          // 而且目前不支持 option 来在产生负优化时直接使用源文件，相关 issue https://github.com/kornelski/pngquant/issues/338
          // ['pngquant', { quality: [0.65, 0.9], speed: 4 }],
        ]
      }
    }))
  }

  return config
}

/** 获取用于 dev server 的 webpack 配置（但不含对 dev server 本身的配置）*/
export async function getConfigForDevServer() {

  let config = await getConfig()
  const buildConfig = await findBuildConfig()
  const { filesystemCache, highQualitySourceMap, errorOverlay } = buildConfig.optimization
  const isDev = getEnv() === Env.Dev

  // 只保留 publicPath 中的 path，确保静态资源请求与页面走相同的 host（即本地 dev server）
  config = produce(config, newConfig => {
    newConfig.output!.publicPath = getPathFromUrl(buildConfig.publicUrl)
  })

  if (isDev && filesystemCache) {
    config = enableFilesystemCache(config)
  }

  if (isDev) {
    config = processSourceMapForDevServer(config, highQualitySourceMap)
  }

  if (isDev) {
    config = appendPlugins(
      config,
      new ReactFastRefreshPlugin({
        overlay: errorOverlay
      })
    )
  }

  return config
}

/** 获取合适的 webpack mode */
function getMode(): Configuration['mode'] {
  const buildEnv = getEnv()
  if (buildEnv === Env.Dev) return 'development'
  if (buildEnv === Env.Prod) return 'production'
  return 'none'
}

/** 构造用于 static 目录复制的 plugin 实例 */
function getStaticDirCopyPlugin(buildConfig: BuildConfig) {
  const staticPath = getStaticPath(buildConfig)
  if (!fs.existsSync(staticPath)) return null
  try {
    const stats = fs.statSync(staticPath)
    if (!stats.isDirectory()) {
      throw new Error('staticPath not a directory')
    }

    return new CopyPlugin({
      patterns: [{ from: staticPath, to: 'static', toType: 'dir' }]
    })
  } catch (e: unknown) {
    logger.warn('Copy staticDir content failed:', e && (e as any).message)
  }
}
