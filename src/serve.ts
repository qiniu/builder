/**
 * @file serve as dev server
 * @author nighca <nighca@live.cn>
 */

import fs from 'fs'
import os from 'os'
import url from 'url'
import type { DevServer } from '@rspack/core'
import { loadRspackCore, loadRspackDevServer } from './utils/rspack-esm'
import type { ClientRequest, IncomingMessage } from 'http'
import logger from './utils/logger'
import { getPageFilename, getPathFromUrl, logLifecycle, watchFile } from './utils'
import { getConfigForDevServer } from './webpack'
import { BuildConfig, DevProxy, findBuildConfig, watchBuildConfig } from './utils/build-conf'
import { entries } from 'lodash'
import colors from 'picocolors'
import { abs } from './utils/paths'

// 业务项目的配置文件，变更时需要重启 server
const projectConfigFiles = [
  'tsconfig.json'
]

async function serve(port: number) {
  let stopDevServer = await runDevServer(port)

  async function restartDevServer() {
    await stopDevServer?.()
    stopDevServer = await runDevServer(port)
  }

  const disposers: Array<() => void> = []

  disposers.push(watchBuildConfig(async () => {
    logger.info('Detected build config change, restarting server...')
    restartDevServer()
  }))

  projectConfigFiles.forEach(file => {
    const filePath = abs(file)
    if (fs.existsSync(filePath)) {
      disposers.push(watchFile(filePath, async () => {
        logger.info(`Detected ${file} change, restarting server...`)
        restartDevServer()
      }))
    }
  })

  process.on('exit', () => {
    disposers.forEach(disposer => disposer())
  })
}

async function runDevServer(port: number) {
  const [{ rspack }, { RspackDevServer }] = await Promise.all([
    loadRspackCore(),
    loadRspackDevServer()
  ])
  const buildConfig = await findBuildConfig()
  const rspackConfig = await getConfigForDevServer()
  logger.debug('rspack config:', rspackConfig)

  const host = '0.0.0.0'
  const devServerConfig: DevServer = {
    host,
    port,
    hot: 'only',
    // 方便开发调试
    allowedHosts: 'all',
    // 让插到页面的 client 脚本自动依据 window.location 去获得 host，
    // 从而正确地建立 hot module replace 依赖的 ws 链接及其它请求。
    // builder 在容器中 serve 时端口会被转发，即可能配置 port 为 80，
    // 在（宿主机）浏览器中通过 8080 端口访问
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
      overlay: buildConfig.optimization.errorOverlay,
      logging: 'none'
    },
    devMiddleware: {
      publicPath: getPathFromUrl(buildConfig.publicUrl),
      stats: 'errors-only'
    },
    proxy: getProxyConfig(buildConfig.devProxy ?? {}),
    historyApiFallback: {
      rewrites: getHistoryApiFallbackRewrites(buildConfig)
    }
  }
  const compiler = rspack(rspackConfig)
  const server = new RspackDevServer(devServerConfig, compiler)

  const firstCompileDone = new Promise<void>(resolve => {
    compiler.hooks.done.tap('DoneHook', () => {
      resolve()
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.startCallback((err: Error | undefined) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })

  await firstCompileDone

  const localUrl = `http://localhost:${port}`
  const networkUrls = getNetworkUrls(port)
  const arrow = colors.green('➜')
  const messages = [
    `${arrow}  ${colors.bold('Local:')}   ${colors.cyan(localUrl)}`,
    ...networkUrls.map(networkUrl => (
      `${arrow}  ${colors.bold('Network:')} ${colors.cyan(networkUrl)}`
    ))
  ]
  logger.info(`Server started:\n\n${messages.join('\n')}`)

  return () => new Promise<void>(resolve => {
    server.stopCallback(() => {
      resolve()
    })
  })
}

export default logLifecycle('Serve', serve, logger)

interface ProxyEntryOptions {
  changeOrigin: boolean
  logger: Pick<Console, 'info' | 'warn' | 'error'>
  on: {
    proxyReq(proxyReq: ClientRequest): void
    proxyRes(proxyRes: IncomingMessage): void
  }
}

/** http-proxy-middleware v4：关闭每条代理请求的 [HPM] 日志 */
const silentProxyLogger: Pick<Console, 'info' | 'warn' | 'error'> = {
  info() {},
  warn() {},
  error: (...args) => console.error(...args)
}

const defaultProxyConfig: ProxyEntryOptions = {

  changeOrigin: true,
  logger: silentProxyLogger,

  on: {
    proxyReq(proxyReq) {
      // add header `X-Real-IP`
      const origin = proxyReq.getHeader('origin') as (string | undefined)
      if (origin) {
        proxyReq.setHeader(
          "X-Real-IP",
          url.parse(origin).hostname!
        )
      }

      // fix `referer` to avoid csrf detect
      const referer = proxyReq.getHeader('referer') as (string | undefined)
      if (referer) {
        proxyReq.setHeader(
          'referer',
          referer.replace(
            url.parse(referer).host!,
            proxyReq.getHeader('host') as string
          )
        )
      }
    },

    proxyRes(proxyRes) {
      // 干掉 set-cookie 中的 secure 设置，因为本地开发 server 是 http 的
      // TODO: 考虑支持 https dev server？
      const setCookie = proxyRes.headers['set-cookie']
      if (setCookie) {
        proxyRes.headers['set-cookie'] = setCookie.map(
          (cookie: string) => cookie.replace('; Secure', '')
        )
      }
    }
  }

}

function getProxyConfig(devProxy: DevProxy): NonNullable<DevServer['proxy']> {
  return Object.entries(devProxy).map(([context, target]) => ({
    context: [context],
    target,
    ...defaultProxyConfig
  }))
}

// get rewrites for devServerConfig.historyApiFallback
function getHistoryApiFallbackRewrites(buildConfig: BuildConfig) {
  const prefix = getPathFromUrl(buildConfig.publicUrl, false)
  return entries(buildConfig.pages).map(
    ([name, { path }]) => ({
      from: new RegExp(path),
      to: '/' + (
        prefix
        ? `${prefix}/${getPageFilename(name)}`
        : getPageFilename(name)
      )
    })
  )
}

function getNetworkUrls(port: number) {
  const addresses = new Set<string>()

  Object.values(os.networkInterfaces()).forEach(networkInterface => {
    networkInterface?.forEach(address => {
      // Node <18 returns family as a number (4 or 6) rather than 'IPv4'/'IPv6'
      const isIPv4 = address.family === 'IPv4' || (address.family as unknown) === 4

      if (isIPv4 && !address.internal) {
        addresses.add(`http://${address.address}:${port}`)
      }
    })
  })

  return [...addresses]
}
