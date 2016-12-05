/*
 * @file builder
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')

module.exports = () => require('./webpack-config')().then(
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
