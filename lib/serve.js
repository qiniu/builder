const _ = require('lodash')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')

const logger = require('./utils/logger')
const logLifecycle = require('./utils').logLifecycle
const getWebpackConfig = require('./webpack-config/serve')

const validatePort = (port) => {
  if (!port) {
    logger.fatal('Missing server port, exit 1')
    process.exit(1)
  }
}

const serve = (port) => getWebpackConfig().then(
  webpackConfig => {
    validatePort(port)
    const host = '0.0.0.0'
    const webpackDevServerConfig = _.extend(
      {}, webpackConfig.devServer, {
        host,
        port,
        // TODO: use false as default value?
        // for there may be security risk
        // https://github.com/webpack/webpack-dev-server/issues/882
        // https://webpack.js.org/configuration/dev-server/#devserver-disablehostcheck
        disableHostCheck: true
      }
    )

    WebpackDevServer.addDevServerEntrypoints(webpackConfig, webpackDevServerConfig)

    logger.debug(`host: ${host}`)
    logger.debug(`port: ${port}`)
    logger.debug('dev server config:')
    logger.debug(webpackDevServerConfig)
    logger.debug('webpack config:')
    logger.debug(webpackConfig)
    logger.debug('webpack module rules:')
    logger.debug(webpackConfig.module.rules)

    const compiler = webpack(webpackConfig)
    const server = new WebpackDevServer(compiler, webpackDevServerConfig)

    server.listen(port, host, () => {
      logger.info(`Starting server on ${host}:${port}`)
    })
  }
)

module.exports = logLifecycle('Serve', serve, logger)
