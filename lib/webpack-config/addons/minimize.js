/*
 * @file minimize config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')

module.exports = config => {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin(),
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
    })
  )
  return config
}
