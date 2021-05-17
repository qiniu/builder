/**
 * @file serve as dev server
 * @author nighca <nighca@live.cn>
 */

import url from 'url'
import webpack from 'webpack'
import WebpackDevServer from 'webpack-dev-server'
import { Config as ProxyConfig } from 'http-proxy-middleware'
import logger from './utils/logger'
import { getPageFilename, getPathFromUrl, logLifecycle } from './utils'
import { getServeConfig } from './webpack'
import { BuildConfig, DevProxy, findBuildConfig, watchBuildConfig } from './utils/build-conf'
import { entries, mapValues } from 'lodash'

async function serve(port: number) {
  let stopServer = await runDevServer(port)
  const stopWatch = watchBuildConfig(async () => {
    logger.info('Detected build config change, stoping server...')
    stopServer?.()
    stopServer = await runDevServer(port)
  })
  process.on('exit', stopWatch)
}

async function runDevServer(port: number) {
  const buildConfig = await findBuildConfig()
  const webpackConfig = await getServeConfig()
  logger.debug('webpack config:', webpackConfig)

  const devServerConfig: WebpackDevServer.Configuration = {
    hotOnly: true,
    // 方便开发调试
    disableHostCheck: true,
    // devServer 中的 public 字段会被拿去计算得到 hot module replace 相关请求的 URI
    // 这里用 0.0.0.0:0 可以让插到页面的 client 脚本自动依据 window.location 去获得 host
    // 从而正确地建立 hot module replace 依赖的 ws 链接及其它请求，逻辑见：
    // 这里之所以要求使用页面的 window.location 信息，是因为 builder 在容器中 serve 时端口会被转发，
    // 即可能配置 port 为 80，在（宿主机）浏览器中通过 8080 端口访问
    public: '0.0.0.0:0',
    publicPath: getPathFromUrl(buildConfig.publicUrl),
    stats: webpackConfig.stats,
    proxy: getProxyConfig(buildConfig.devProxy),
    historyApiFallback: {
      rewrites: getHistoryApiFallbackRewrites(buildConfig)
    }
  }
  const compiler = webpack(webpackConfig)
  const server = new WebpackDevServer(compiler, devServerConfig)

  const host = '0.0.0.0'
  server.listen(port, host, () => {
    logger.info(`Server started on ${host}:${port}`)
  })
  return () => new Promise<void>(resolve => {
    server.close(resolve)
  })
}

export default logLifecycle('Serve', serve, logger)

const defaultProxyConfig: ProxyConfig = {

  changeOrigin: true,

  onProxyReq(proxyReq) {
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

  onProxyRes(proxyRes) {
    // 干掉 set-cookie 中的 secure 设置，因为本地开发 server 是 http 的
    // TODO: 考虑支持 https dev server？
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(
        cookie => cookie.replace('; Secure', '')
      )
    }
  }

}

function getProxyConfig(devProxy: DevProxy) {
  return mapValues(devProxy, target => ({
    ...defaultProxyConfig,
    target
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
