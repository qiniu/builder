import { mapValues } from 'lodash'
import * as fs from 'fs'
import * as path from 'path'
import { Configuration, DefinePlugin, WebpackPluginInstance } from 'webpack'
import * as HtmlPlugin from 'html-webpack-plugin'
import * as CopyPlugin from 'copy-webpack-plugin'
import * as ReactFastRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import { getBuildRoot, abs, getStaticPath, getDistPath, getSrcPath } from '../utils/paths'
import { BuildConfig, findBuildConfig } from '../utils/build-conf'
import { addTransforms } from './transform'
import { Env, getEnv } from '../utils/build-env'
import logger from '../utils/logger'
import { getPathFromUrl } from '../utils'

const dirnameOfBuilder = path.resolve(__dirname, '../../..')
const nodeModulesOfBuilder = path.resolve(dirnameOfBuilder, 'node_modules')

export async function getConfig(): Promise<Configuration> {
  const buildConfig = await findBuildConfig()

  const htmlPlugins = Object.entries(buildConfig.pages).map(([ name, { template, entries } ]) => {
    return new HtmlPlugin({
      template: abs(template),
      filename: `${name}.html`,
      chunks: entries
    })
  })

  const definePlugin = new DefinePlugin(
    // webpack DefinePlugin 只是简单的文本替换，这里进行 JSON stringify 转换
    mapValues(buildConfig.envVariables, JSON.stringify)
  )

  const plugins: WebpackPluginInstance[] = [
    ...htmlPlugins,
    definePlugin
  ]

  const staticDirCopyPlugin = getStaticDirCopyPlugin(buildConfig)
  if (staticDirCopyPlugin) {
    plugins.push(staticDirCopyPlugin)
  }

  if (getEnv() === Env.Dev) {
    plugins.push(new ReactFastRefreshPlugin())
  }

  let config: Configuration = {
    mode: getMode(),
    context: getBuildRoot(),
    resolve: {
      // 同默认配置，这里写出来是因为后续会有新增 extensions
      extensions: ['.wasm', '.mjs', '.js', '.json'],
      modules: [
        getSrcPath(buildConfig),
        abs('node_modules'),
        nodeModulesOfBuilder,
        dirnameOfBuilder,
        'node_modules'
      ]
    },
    resolveLoader: {
      modules: [
        nodeModulesOfBuilder,
        dirnameOfBuilder,
        'node_modules'
      ]
    },
    entry: mapValues(buildConfig.entries, entryFile => abs(entryFile)),
    module: { rules: [] },
    plugins: plugins,
    output: {
      path: getDistPath(buildConfig),
      filename: 'static/[name]-[contenthash].js',
      chunkFilename: 'static/[id]-[chunkhash].js',
      publicPath: (
        getEnv() === Env.Prod
        ? buildConfig.publicUrl
        : getPathFromUrl(buildConfig.publicUrl)
      )
    }
  }

  config = addTransforms(config, buildConfig)

  logger.debug('webpack config:', config)

  return config
}

function getMode(): Configuration['mode'] {
  const buildEnv = getEnv()
  if (buildEnv === Env.Dev) return 'development'
  if (buildEnv === Env.Prod) return 'production'
  return 'none'
}

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
