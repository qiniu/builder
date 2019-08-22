/*
 * @file common webpack config for builds
 * @author nighca <nighca@live.cn>
 */

const fs = require('fs')
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const utils = require('../utils')
const paths = require('../utils/paths')
const logger = require('../utils/logger')
const buildEnv = require('../utils/build-env')
const findBuildConfig = require('../utils/build-conf').find
const getCommonConfig = require('./common')

module.exports = () => Promise.all([
  findBuildConfig(),
  getCommonConfig()
]).then(
  ([buildConfig, webpackConfig]) => {
    const env = buildEnv.get()

    const projectPaths = {
      root: paths.getBuildRoot(buildConfig),
      src: paths.getSrcPath(buildConfig),
      dist: paths.getDistPath(buildConfig)
    }

    const entries = Object.keys(buildConfig.entries).reduce((entries, name) => {
      entries[name] = path.join(projectPaths.root, buildConfig.entries[name])
      return entries
    }, {})

    utils.extend(webpackConfig.entry, entries)

    const pages = Object.keys(buildConfig.pages).reduce((pages, name) => {
      const page = buildConfig.pages[name]
      // 兼容 page.entries 是字符串不是数组的情况
      const entries = Array.isArray(page.entries) ? page.entries : [page.entries]
      pages[name] = utils.extend({}, page, { entries })
      return pages
    }, {})

    // gen pages
    webpackConfig = require('./addons/gen-pages')(webpackConfig, pages, buildConfig.publicUrl, buildConfig.optimization)

    // gen static
    const staticPath = paths.getStaticPath(buildConfig)
    if (fs.existsSync(staticPath)) {
      try {
        const stats = fs.statSync(staticPath)
        if (!stats.isDirectory()) {
          throw new Error('staticPath not a directory')
        }

        webpackConfig.plugins.push(
          new CopyWebpackPlugin([
            {
              from: staticPath,
              to: 'static',
              toType: 'dir'
            }
          ], {
            debug: logger.level === 'debug' ? 'info' : 'warning',
            context: projectPaths.root
          })
        )
      } catch (e) {
        logger.warn('Copy staticDir content failed:', e.message)
      }
    }

    webpackConfig.output = {
      path: projectPaths.dist,
      filename: 'static/[name]-[hash].js',
      chunkFilename: 'static/[id]-[chunkhash].js',
      publicPath: (
        env === buildEnv.prod
        ? buildConfig.publicUrl.replace(/\/?$/, '/')
        : utils.getPathFromUrl(buildConfig.publicUrl)
      )
    }

    return webpackConfig
  }
)
