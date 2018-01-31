/*
 * @file image-compression
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')

const utils = require('../../utils')

const compressionIfNecessary = rule => {
  const loaders = rule.use
  const firstLoaderName = loaders[0].__loaderName__
  if (firstLoaderName !== 'file-loader' || !utils.isImage(rule.test)) {
    return rule
  }
  return utils.extend({}, rule, {
    use: [
      ...loaders,
      {
        loader: 'image-webpack-loader',
        options: {
          mozjpeg: {
            progressive: true,
            quality: 65
          },
          pngquant: {
            quality: '65-90',
            speed: 4
          },
          gifsicle: {
            interlaced: false,
          },
          webp: {
            quality: 75
          }
        }
      }
    ]
  })
}

module.exports = (webpackConfig, { imageCompression }) => {
  if (!imageCompression) {
    return webpackConfig
  }
  webpackConfig = update(webpackConfig, {
    module: { rules: {
      $set: webpackConfig.module.rules.map(
        compressionIfNecessary
      )
    } }
  })

  return webpackConfig
}
