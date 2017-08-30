/*
 * @file transform to loader & config
 * @author nighca <nighca@live.cn>
 */

const webpack = require('webpack')
const update = require('immutability-helper')

const env = require('../../env')
const paths = require('../../paths')
const utils = require('../../utils')
const transforms = require('../../constants/transforms')

const regexpEscape= s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

const makeExtensionPattern = extension => new RegExp(`\\.${regexpEscape(extension)}\$`)

const makeLoaderName = name => (
  /\-loader$/.test(name) ? name : `${name}-loader`
)

// TODO: 有潜在 bug，preset 有可能不长成 babel-preset-... 的形状
// 加前缀的行为应该用白名单控制
const adaptBabelPresetName = name => require.resolve(
  /^babel\-preset\-/.test(name) ? name : `babel-preset-${name}`
)

const makeBabelPreset = preset => (
  typeof preset === 'string'
  ? adaptBabelPresetName(preset)
  : [adaptBabelPresetName(preset[0]), ...preset.slice(1)]
)

// TODO: 添加 babel-plugin- 前缀
const adaptBabelPluginName = name => require.resolve(name)


const makeBabelPlugin = plugin => (
  typeof plugin === 'string'
  ? adaptBabelPluginName(plugin)
  : [adaptBabelPluginName(plugin[0]), ...plugin.slice(1)]
)

// 修改 babel-loader 的配置以适配 webpack2 (enable tree-shaking，由 webpack 来做 module 格式的转换)
// 找到 es2015 这个 preset，添加 { "modules": false }
// 注意后续可能要修改这边逻辑，考虑会对 import / export 进行转换的不一定只有 es2015 这个 preset
const adaptBabelLoaderOptions = options => {
  if (!options) {
    return options
  }
  return update(options, {
    presets: {
      $set: (options.presets || []).map(
        preset => {
          if (preset === 'es2015') {
            return ['es2015', { 'modules': false }]
          }
          if (preset && preset[0] === 'es2015') {
            return ['es2015', utils.extend({}, preset[1], { 'modules': false })]
          }
          return preset
        }
      ).map(makeBabelPreset)
    },
    plugins: {
      $set: (options.plugins || []).map(makeBabelPlugin)
    }
  })
}

const adaptLoader = ({ loader, options }) => {
  loader = makeLoaderName(loader)
  options = loader === 'babel-loader' ? adaptBabelLoaderOptions(options) : options
  return {
    loader: require.resolve(loader),
    options
  }
}

const makeRule = (extension, context, ...loaderList) => {
  const rule = {
    test: makeExtensionPattern(extension),
    use: loaderList.map(adaptLoader)
  }

  // 防止 webpack 乱报错
  Object.defineProperty(rule, '__extension__', {
    value: extension,
    enumerable: false,
    configurable: true
  })

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

const makeReactBabelOptions = config => {
  const options = config && config.babelOptions || {}
  const presets = options.presets || []
  const plugins = options.plugins || []
  return utils.extend(options, {
    presets: presets.concat(['react']),
    plugins: plugins.concat(['react-hot-loader/babel'])
  })
}

module.exports = (config, key, transform, post) => {
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

  // 目前仅 vue 需要在其他 transform 加完后再加配置
  const postTransformers = [transforms.vue]
  if (post && postTransformers.indexOf(transform.transformer) < 0) {
    return config
  }

  switch(transform.transformer) {
    case transforms.css:
    case transforms.less:
    case transforms.sass:
    case transforms.stylus:
      const postcssOptions = utils.extend({
        ident: 'postcss' // https://github.com/postcss/postcss-loader/issues/281#issuecomment-319089901
      }, transform.config && transform.config.postcssOptions)
      const loaders = [
        { loader: 'style-loader' },
        { loader: 'css-loader', options: { importLoaders: 1 } },
        { loader: 'postcss-loader', options: postcssOptions }
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

      const tsLoaderOptions = {
        // 开发模式跳过类型检查，提高构建效率，另，避免过严的限制
        transpileOnly: env === 'development'
      }

      config = addDefaultExtension(config, extension)
      config = update(config, {
        module: { rules: {
          $push: [makeRule(
            extension,
            context,
            { loader: 'babel', options: babelOptions },
            { loader: 'ts', options: tsLoaderOptions }
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
      // 首次不处理，其它完成后再处理
      if (!post) break

      // 将外部其他的 transform 配置依样画葫芦配置到 vue-loader 里
      // 保持 vue 文件中对资源的处理逻辑与外部一致
      const options = {
        loaders: config.module.rules.reduce(
          (loaders, rule) => {
            loaders[rule.__extension__] = rule.use
            return loaders
          },
          {}
        )
      }
      config = update(config, {
        module: { rules: {
          $push: [
            makeRule(extension, context, {
              loader: 'vue',
              options
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
