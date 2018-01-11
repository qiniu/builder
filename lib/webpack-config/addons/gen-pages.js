/*
 * @file generate pages
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const buildEnv = require('../../utils/build-env')
const paths = require('../../utils/paths')
const utils = require('../../utils')

module.exports = (config, pageMap, publicUrl) => {
  const pages = Object.keys(pageMap).map(
    name => utils.extend({}, pageMap[name], {
      fixedName: utils.fixPageName(name),
      filename: `${name}.html`,
      template: paths.abs(pageMap[name].template)
    })
  )

  // html webpack plugin
  const htmlPlugins = pages.map(
    ({ fixedName, filename, template, entries, vendor }) => {
      // chunks 顺序很重要, chunksSortMode 会根据此顺序插入 html
      let chunks = [
        `__common-${fixedName}`,
        ...entries
      ]
      if (vendor) {
        chunks = [
          `__adapter-${fixedName}`,
          vendor,
          ...chunks
        ]
      }
      return new HtmlWebpackPlugin({
        template,
        filename,
        chunks,
        chunksSortMode: 'manual',
        minify: buildEnv.get() === 'production' ? {
          minifyCSS: true,
          minifyJS: true,
          collapseWhitespace: true,
          removeComments: true
        } : false
      })
    }
  )

  config = update(config, {
    plugins: {
      $push: htmlPlugins
    }
  })

  const prefix = utils.getPathFromUrl(publicUrl, false)

  // historyApiFallback rewrites
  const rewritesForHistoryApiFallback = pages.filter(
    page => page.hasOwnProperty('path')
  ).map(
    ({ path, filename }) => ({
      from: new RegExp(path),
      to: '/' + (
        prefix
        ? `${prefix}/${filename}`
        : filename
      )
    })
  )

  config = update(config, {
    devServer: { historyApiFallback: { rewrites: {
      $push: rewritesForHistoryApiFallback
    } } }
  })

  return config
}
