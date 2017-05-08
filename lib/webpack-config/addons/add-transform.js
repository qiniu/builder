/*
 * @file transform to loader & config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')

const paths = require('../../paths')
const utils = require('../../utils')
const transforms = require('../../constants/transforms')

const regexpEscape= s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

const makeExtensionPattern = extension => new RegExp(`\\.${regexpEscape(extension)}\$`)

const makeLoaderName = name => (
  /\-loader$/.test(name) ? name : `${name}-loader`
)

// 修改 babel-loader 的配置以适配 webpack2 (enable tree-shaking，由 webpack 来做 module 格式的转换)
// 找到 es2015 这个 preset，添加 { "modules": false }
// 注意后续可能要修改这边逻辑，考虑会对 import / export 进行转换的不一定只有 es2015 这个 preset
const adaptBabelLoaderOptions = options => {
  if (!options || !options.presets) {
    return options
  }
  return update(options, {
    presets: {
      $set: options.presets.map(
        preset => {
          if (preset === 'es2015') {
            return ['es2015', { 'modules': false }]
          }
          if (preset && preset[0] === 'es2015') {
            return ['es2015', utils.extend({}, preset[1], { 'modules': false })]
          }
          return preset
        }
      )
    }
  })
}

const makeRule = (extension, context, ...loaderList) => {
  const rule = {
    test: makeExtensionPattern(extension),
    use: loaderList.map(
      ({ loader, options }) => {
        loader = makeLoaderName(loader)
        options = loader === 'babel-loader' ? adaptBabelLoaderOptions(options) : options
        return { loader, options }
      }
    )
  }

  if (context) {
    rule.issuer = makeExtensionPattern(context)
  }

  // 针对后缀为 js 的 transform，控制范围（不对依赖做转换）
  if (extension === 'js') {
    rule.exclude = /(node_modules)/
  }

  return rule
}

const addDefaultExtension = (config, extension) => {
  extension = extension && ('.' + extension)
  if (config.resolve.extensions.indexOf(extension) >= 0) {
    return config
  }
  return update(config, {
    resolve: {
      extensions: {
        $push: [extension]
      }
    }
  })
}

const makeReactBabelOptions = config => utils.extend(
  {
    presets: ['es2015', 'react'].map(name => require.resolve('babel-preset-' + name)),
    plugins: ['react-hot-loader/babel'].map(require.resolve)
  },
  config && config.options
)

module.exports = (config, key, transform) => {
  if (!key || typeof key !== 'string') {
    throw new TypeError(`Invalid transform key: ${JSON.stringify(key)}`)
  }

  const [extension, context] = key.split('@')

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
      const loaders = [
        { loader: 'style-loader' },
        { loader: 'css-loader', options: { importLoaders: 1 } },
        { loader: 'postcss-loader' }
      ]
      if (transform.transformer !== 'css') {
        loaders.push({ loader: transform.transformer, options: transform.config })
      }
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, context, ...loaders)]
        } }
      })
      break

    case transforms.babel:
      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, context, { loader: 'babel', options: transform.config })]
        } }
      })
      break

    case transforms.jsx:
      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, context, {
            loader: 'babel',
            options: makeReactBabelOptions(transform.config)
          })]
        } }
      })
      break

    case transforms.ts:
    case transforms.tsx:
      const babelOptions = (
        transform.transformer === transforms.tsx
        ? makeReactBabelOptions(transform.config)
        : transform.config
      )

      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(
            extension,
            context,
            { loader: 'babel', options: babelOptions },
            { loader: 'ts' }
          )]
        } }
      })
      break

    case transforms.flow:
      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, context, { loader: transform.transformer, options: transform.config })]
        } }
      })
      break

    case transforms.file:
      config = update(config, {
        module: { rules: {
          $push: [
            makeRule(extension, context, {
              loader: 'file',
              options: { name: 'static/[name]-[hash].[ext]' }
            })
          ]
        } }
      })
      break

    case transforms.vue:
      // TODO: 对 vue-loader 中 babel-loader 的配置进行 adaptBabelLoaderOptions 的操作
      config = update(config, {
        module: { rules: {
          $push: [
            makeRule(extension, context, {
              loader: 'vue',
              options: transform.config
            })
          ]
        } }
      })
      break

    case transforms['svg-sprite']:
      config = update(config, {
        module: { rules: {
          $push: [
            makeRule(extension, context, {
              loader: 'svg-sprite',
              options: { name: '[name]-[hash]' }
            })
          ]
        } }
      })
      break

    default:
      config = update(config, {
        module: { rules: {
          $push: [makeRule(extension, context, { loader: transform.transformer, options: transform.config })]
        } }
      })
  }

  return config
}
