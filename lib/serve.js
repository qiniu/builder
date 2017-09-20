const _ = require('lodash')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

const logger = require('./utils/logger')
const logLifecycle = require('./utils').logLifecycle
const getWebpackConfig = require('./webpack-config/serve')

const serve = port => getWebpackConfig().then(
  webpackConfig => {
    const host = '0.0.0.0'
    const webpackDevServerConfig = _.extend(
      {}, webpackConfig.devServer, { host, port }
    )

    WebpackDevServer.addDevServerEntrypoints(webpackConfig, webpackDevServerConfig)

    const compiler = webpack(webpackConfig)
    const server = new WebpackDevServer(compiler, webpackDevServerConfig)

    logger.debug(`host: ${host}`)
    logger.debug(`port: ${port}`)
    logger.debug('dev server config:')
    logger.debug(webpackDevServerConfig)
    logger.debug('webpack config:')
    logger.debug(webpackConfig)

    server.listen(port, host, () => {
      logger.info(`Starting server on ${host}:${port}`)
    })
  }
)

module.exports = logLifecycle('serve', serve, logger)
