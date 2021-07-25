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
import { getBuildRoot, abs, getStaticPath, getDistPath, getSrcPath } from '../utils/paths'
import { BuildConfig, findBuildConfig, getNeedAnalyze } from '../utils/build-conf'
import { adaptLoader, addTransforms, appendCacheGroups, parseOptimizationConfig } from './transform'
import { Env, getEnv } from '../utils/build-env'
import logger from '../utils/logger'
import { getPathFromUrl, getPageFilename } from '../utils'
import { appendPlugins } from '../utils/webpack'

const dirnameOfBuilder = path.resolve(__dirname, '../..')
const nodeModulesOfBuilder = path.resolve(dirnameOfBuilder, 'node_modules')

/** 获取 webpack 配置（构建用） */
export async function getConfig(): Promise<Configuration> {
  const buildConfig = await findBuildConfig()

  let config: Configuration = {
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
      ]
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
      publicPath: (
        getEnv() === Env.Prod
        ? buildConfig.publicUrl
        : getPathFromUrl(buildConfig.publicUrl)
      ),
      environment: {
        // 这里控制 webpack 本身的运行时代码（而不是业务代码），
        // 对于语言 feature 先全部配合不支持，以确保 webpack 会产出兼容性最好的代码；
        // TODO: 后续考虑通过使用 build config 中的 targets.browsers 来挨个判断是否支持
        arrowFunction: false,
        bigIntLiteral: false,
        const: false,
        destructuring: false,
        dynamicImport: false,
        forOf: false,
        module: false
      }
    },
    optimization: {
      minimizer: [
        '...',
        new CssMinimizerPlugin()
      ]
    }
  }

  let baseChunks: string[] = []

  if (getEnv() === Env.Prod) {
    const result = parseOptimizationConfig(buildConfig.optimization)
    baseChunks = result.baseChunks
    config = appendCacheGroups(config, result.cacheGroups)
  }

  if (getEnv() === Env.Dev) {
    config = processSourceMap(config, buildConfig.optimization.highQualitySourceMap)
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

  if (getEnv() === Env.Prod) {
    config = appendPlugins(config, new MiniCssExtractPlugin({
      filename: 'static/[name]-[contenthash].css',
      chunkFilename: 'static/[id]-[chunkhash].css'
    }))
  }

  if (getNeedAnalyze()) {
    config = appendPlugins(config, new BundleAnalyzerPlugin())
  }

  return config
}

/** 获取 webpack 配置（dev server 用） */
export async function getServeConfig() {
  const config = await getConfig()
  return appendPlugins(
    config,
    new ReactFastRefreshPlugin()
  )
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
  } catch (e) {
    logger.warn('Copy staticDir content failed:', e.message)
  }
}

function processSourceMap(previousConfig: Configuration, highQuality: boolean) {
  return produce(previousConfig, (config: Configuration) => {
    config.devtool = highQuality ? 'eval-source-map' : 'eval'
    config.module?.rules?.push({
      test: /node_modules\/.*\.js$/,
      enforce: 'pre',
      use: [{
        loader: 'source-map-loader',
        options: {
          filterSourceMappingUrl(_url: string, _resourcePath: string) {
            // highQuality 为 false 时也需要引入 source-map-loader 并在这里返回 remove
            // 来把第三方库代码中的 SourceMappingURL 信息干掉，以避免开发时的 warning
            return highQuality ? 'consume' : 'remove'
          }
        }
      }].map(adaptLoader)
    })
  })
}
