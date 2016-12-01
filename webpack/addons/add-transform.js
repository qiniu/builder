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

const makeLoaderConfig = (extension, transform, options) => {
  const loaderConfig = {
    test: makeExtensionPattern(extension),
    use: [
      {
        loader: makeLoaderName(transform.transformer),
        options
      }
    ],
    // include: [paths.src],
    // exclude: /(node_modules)/
  }

  // 针对后缀为 js 的 transform，控制范围（不对依赖做转换）
  if (extension === 'js') {
    loaderConfig.exclude = /(node_modules)/
  }

  return loaderConfig
}

const makeStyleLoaderConfig = (extension, transform) => {
  const loaderConfig = {
    test: makeExtensionPattern(extension),
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'postcss-loader' }
    ]
  }

  if (transform.transformer !== transforms.css) {
    loaderConfig.use.push(
      { loader: makeLoaderName(transform.transformer) }
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
      config.module.rules.push(
        makeStyleLoaderConfig(extension, transform)
      )
      break

    case transforms.babel:
      config = addDefaultExtension(config, extension)

      // 找到 ES2015 这个 preset，添加 { "modules": false }
      // 注意后续可能要修改这边逻辑，考虑会对 import / export 进行转换的不一定只有 ES2015 这个 preset
      const options = transform.config && utils.extend({}, transform.config)
      if (options && options.presets) {
        options.presets = options.presets.map(
          preset => {
            if (preset === 'ES2015') {
              return ['ES2015', { 'modules': false }]
            }
            if (preset && preset[0] === 'ES2015') {
              return ['ES2015', utils.extend({}, preset[1], { 'modules': false })]
            }
            return preset
          }
        )
      }
      config.module.rules.push(
        makeLoaderConfig(extension, transform, options)
      )
      break

    case transforms.typescript:
    case transforms.jsx:
    case transforms.flow:
      config = addDefaultExtension(config, extension)
      config.module.rules.push(
        makeLoaderConfig(extension, transform)
      )
      break

    case transforms.file:
      config.module.rules.push(
        makeLoaderConfig(extension, transform, {
          name: 'static/[name]-[hash].[ext]'
        })
      )
      break

    default:
      config.module.rules.push(
        makeLoaderConfig(extension, transform)
      )
  }

  return config
}
