/*
 * @file config for define env
 * @author nighca <nighca@live.cn>
 */

const _ = require('lodash')
const webpack = require('webpack')
const update = require('immutability-helper')
const { abs } = require('../../utils/paths')
const { fixPageName } = require('../../utils')

module.exports = (config, pages) => {
  const fixedPages = Object.keys(pages).map((name) => {
    const page = pages[name]
    return {
      fixedName: fixPageName(name),
      vendor: page.vendor,
      entries: Array.isArray(page.entries) ? page.entries : [page.entries]
    }
  })

  const vendorPlugins = []
  fixedPages.forEach(({ entries, vendor }) => {
    if (vendor) {
      entries.forEach(entry => {
        vendorPlugins.push(
          new webpack.optimize.CommonsChunkPlugin({
            name: vendor,
            chunks: [
              vendor,
              entry
            ]
          })
        )
      })
    }
  })

  return update(config, {
    plugins: { $push: [
      // async common-chunks
      // 这里指定的是全部 pages 因为 chunks 和 children 不能同时设定
      new webpack.optimize.CommonsChunkPlugin({
        children: true,
        async: true
      }),
      // 确保 vendor 在内容不变的情况下不会因为对 entries 的依赖改变而导致 hash 发生变化
      ...fixedPages.map(({ fixedName, entries, vendor }) => {
        if (vendor) {
          return new webpack.optimize.CommonsChunkPlugin({
            name: `__adapter-${fixedName}`,
            chunks: [
              vendor,
              ...entries
            ],
            minChunks: Infinity
          })
        }
        return null
      })
      .filter(item => item !== null),
      // 确保 entries 中所有在 vendor 中引入的依赖不会再被重复引入
      ...vendorPlugins,
      // entries 中如果有公用的地方抽离成 common
      ...fixedPages.map(({ fixedName, entries }) => {
        return new webpack.optimize.CommonsChunkPlugin({
          name: `__common-${fixedName}`,
          chunks: [
            ...entries
          ]
        })
      })
    ] }
  })
}
