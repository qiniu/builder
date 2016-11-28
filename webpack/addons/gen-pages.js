/*
 * @file generate pages
 * @author nighca <nighca@live.cn>
 */

const HtmlWebpackPlugin = require('html-webpack-plugin')

const paths = require('../../lib/paths')

module.exports = (config, pages) => {
  const pageInfos = Object.keys(pages).map(name => {
    const { template, entries } = pages[name]
    return {
      template: paths.abs(template),
      filename: `${name}.html`,
      chunks: entries
    }
  })

  config.plugins = config.plugins.concat(pageInfos.map(
    ({ template, filename, chunks }) => new HtmlWebpackPlugin({
      template,
      filename,
      chunks
    })
  ))

  return config
}
