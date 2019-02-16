/*
 * @file minimize config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = config => {
  if (!config.optimization) {
    config.optimization = {}
  }
  if (!config.optimization.minimizer) {
    config.optimization.minimizer = []
  }
  config.optimization.minimizer.push(
    new UglifyJsPlugin({
      sourceMap: true
    })
  )
  
  /*,
  // 先不设置这个，因为这个会导致 css-loader（也许是 less-loader？）对 css 内容做压缩
  // 压缩时会将 /deep/ 前后的空格移除，导致 /deep/ 选择器不能正确地被 vue-loader 识别
  // 从而导致 /deep/ 对 vue-loader 提供的 scoped css 不生效，具体 /deep/ 的作用见：
  // https://vue-loader.vuejs.org/zh-cn/features/scoped-css.html#深度作用选择器
  new webpack.LoaderOptionsPlugin({
    minimize: true,
    options: {
      resolve: {
        // https://github.com/TypeStrong/ts-loader#webpack
        // If you are using webpack 2 with the LoaderOptionsPlugin.
        // If you are faced with the Cannot read property 'unsafeCache' of undefined error
        // then you probably need to supply a resolve object
        extensions: config.resolve.extensions
      }
    }
  })*/
  return config
}
