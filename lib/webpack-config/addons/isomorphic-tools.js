/*
 * @file config isomorphic-tools for ssr
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const WebpackIsomorphicToolsPlugin = require('webpack-isomorphic-tools/plugin')

module.exports = (config, isomorphicTools) => {
  if (!isomorphicTools) {
    return config
  }
  const webpackIsomorphicToolsPlugin = new WebpackIsomorphicToolsPlugin(isomorphicTools)
  return update(config, {
    plugins: { $push: [
      new WebpackIsomorphicToolsPlugin(isomorphicTools)
    ] }
  })
}
