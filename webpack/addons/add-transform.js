/*
 * @file transform to loader & config
 * @author nighca <nighca@live.cn>
 */

const conf = require('../../lib/conf')
const paths = require('../../lib/paths')
const utils = require('../../lib/utils')
const transforms = require('../../lib/constants/transforms')

const makeExtensionPattern = extension => new RegExp(`\\.${extension}\$`)

const makeLoaderName = name => (
  /\-loader$/.test(name) ? name : `${name}-loader`
)

const makeLoaderConfig = (extension, transform) => {
  return {
    test: makeExtensionPattern(extension),
    loader: makeLoaderName(transform.transformer),
    // include: [paths.src],
    // exclude: /(node_modules)/
  }
}

const makeStyleLoaderConfig = (extension, transform) => {
  const loaderConfig = {
    test: makeExtensionPattern(extension),
    loaders: ['style-loader', 'css-loader', 'postcss-loader']
  }

  if (transform.transformer !== transforms.css) {
    loaderConfig.loaders.push(
      makeLoaderName(transform.transformer)
    )
  }

  return loaderConfig
}

const addDefaultExtension = (config, extension) => {
  extension = extension && ('.' + extension)
  const existed = config.resolve.extensions
  if (existed.indexOf(extension) < 0) {
    existed.push(extension)
  }
  return config
}

module.exports = (config, extension, transform) => {
  if (!extension || typeof extension !== 'string') {
    throw new TypeError(`Invalid extension: ${JSON.stringify(extension)}`)
  }

  if (typeof transform === 'string') {
    transform = {
      transformer: transform
    }
  }

  if (!transform || !transform.transformer || typeof transform.transformer !== 'string') {
    throw new TypeError(`Invalid transform info: ${JSON.stringify(transform)}`)
  }

  switch(transform.transformer) {
    case transforms.css:
    case transforms.less:
    case transforms.sass:
    case transforms.stylus:
      config.module.loaders.push(
        makeStyleLoaderConfig(extension, transform)
      )
      break

    case transforms.babel:
      config = addDefaultExtension(config, extension)
      config.module.loaders.push(
        utils.extend(makeLoaderConfig(extension, transform), {
          query: transform.config
        })
      )
      break

    case transforms.typescript:
    case transforms.jsx:
    case transforms.flow:
      config = addDefaultExtension(config, extension)
      config.module.loaders.push(
        makeLoaderConfig(extension, transform)
      )
      break

    case transforms.file:
      config.module.loaders.push(
        utils.extend(makeLoaderConfig(extension, transform), {
          query: {
            name: 'static/[name]-[hash].[ext]'
          }
        })
      )
      break

    default:
      config.module.loaders.push(
        makeLoaderConfig(extension, transform)
      )
  }

  return config
}
