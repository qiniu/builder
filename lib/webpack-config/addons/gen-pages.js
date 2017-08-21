/*
 * @file generate pages
 * @author nighca <nighca@live.cn>
 */

const url = require('url')
const update = require('immutability-helper')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const paths = require('../../paths')
const utils = require('../../utils')

module.exports = (config, pageMap, publicUrl) => {
  const pages = Object.keys(pageMap).map(
    name => utils.extend({}, pageMap[name], {
      filename: `${name}.html`,
      template: paths.abs(pageMap[name].template)
    })
  )

  // html webpack plugin
  const htmlPlugins = pages.map(
    ({ filename, template, entries }) => new HtmlWebpackPlugin({
      template,
      filename,
      chunks: entries
    })
  )

  config = update(config, {
    plugins: {
      $push: htmlPlugins
    }
  })

  // 目前本地开发的时候不会使用 publicUrl 中的 path 作为提供给 webpack 的 output.publicPath
  // 所以这里也不需要在映射页面时拼上这个前缀
  // TODO: 统一开发时与构建时行为
  // publicUrl = url.parse(publicUrl)
  // const prefix = publicUrl.pathname.replace(/^\//, '').replace(/\/$/, '')

  // historyApiFallback rewrites
  const rewritesForHistoryApiFallback = pages.filter(
    page => page.hasOwnProperty('path')
  ).map(
    ({ path, filename }) => ({
      from: new RegExp(path),
      to: '/' + filename
      // 如上所述，这里先保留
      // to: '/' + (
      //   prefix
      //   ? `${prefix}/${filename}`
      //   : filename
      // )
    })
  )

  config = update(config, {
    devServer: { historyApiFallback: { rewrites: {
      $push: rewritesForHistoryApiFallback
    } } }
  })

  return config
}
