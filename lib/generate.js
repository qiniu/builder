/*
 * @file generate dist files
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')

const logger = require('./utils/logger')
const logLifecycle = require('./utils').logLifecycle

const generate = () => require('./webpack-config')().then(
  webpackConfig => new Promise((resolve, reject) => {
    webpack(webpackConfig, (err, stats) => {
      if (err || stats.hasErrors()) {
        reject(err || stats.toJson().errors)
        return
      }
      resolve()
    })
  })
)

module.exports = logLifecycle('generate', generate, logger)
