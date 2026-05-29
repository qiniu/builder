import fs from 'fs'
import path from 'path'
import type { rspack as Rspack, RspackPluginInstance } from '@rspack/core'
import type { WebpackBarOptions } from 'webpackbar'

type RspackProgressInfo = {
  builtModules?: number
  moduleIdentifier?: string
}

type WebpackBarInstance = {
  apply(compiler: unknown): void
  updateProgress(percent: number, message: string, details: string[]): void
}

type WebpackBarConstructor = new (options?: WebpackBarOptions) => WebpackBarInstance

function loadWebpackBarClass(): WebpackBarConstructor {
  const sharedDir = path.join(
    path.dirname(require.resolve('webpackbar/rspack')),
    'shared'
  )
  const sharedBundle = fs.readdirSync(sharedDir).find(
    name => name.startsWith('webpackbar.') && name.endsWith('.cjs')
  )
  if (!sharedBundle) {
    throw new Error('Cannot find webpackbar shared bundle')
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path.join(sharedDir, sharedBundle)).WebpackBar
}

function toProgressDetails(info: unknown): string[] {
  if (typeof info === 'string') {
    return [info]
  }
  if (Array.isArray(info)) {
    return info.filter((item): item is string => typeof item === 'string')
  }
  if (info != null && typeof info === 'object' && 'moduleIdentifier' in info) {
    const { moduleIdentifier } = info as RspackProgressInfo
    return typeof moduleIdentifier === 'string' ? [moduleIdentifier] : []
  }
  return []
}

/** webpackbar/rspack 与 Rspack 2 ProgressPlugin 的 info 对象格式不兼容，在此适配 */
export function createWebpackBarRspackPlugin(
  rspack: typeof Rspack,
  options?: WebpackBarOptions
): RspackPluginInstance {
  const WebpackBar = loadWebpackBarClass()
  const webpackbar = new WebpackBar(options)
  const progressPlugin = new rspack.ProgressPlugin((percent, message, info) => {
    webpackbar.updateProgress(percent, message, toProgressDetails(info))
  })

  return {
    apply(compiler) {
      progressPlugin.apply(compiler)
      webpackbar.apply(compiler)
    }
  }
}
