/**
 * @file builder
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const webpack = require('webpack')

const utils = require('../utils')
const logger = require('../utils/logger')
const buildEnv = require('../utils/build-env')
const findBuildConfig = require('../utils/build-conf').find
const paths = require('../utils/paths')
const nodeModulesOfBuilder = path.resolve(__dirname, '../../node_modules')
const dirnameOfBuilder = path.resolve(__dirname, '../../..')

module.exports = () => findBuildConfig().then(
  buildConfig => {
    const env = buildEnv.get()

    const projectPaths = {
      root: paths.getBuildRoot(buildConfig),
      src: paths.getSrcPath(buildConfig),
      dist: paths.getDistPath(buildConfig),
      dep: paths.abs('node_modules')
    }

    // original webpack config
    let webpackConfig = {

      context: projectPaths.root,

      entry: {},

      resolve: {
        extensions: ['.js'],
        modules: [
          projectPaths.src,
          projectPaths.dep,
          nodeModulesOfBuilder,
          dirnameOfBuilder,
          'node_modules'
        ]
      },

      resolveLoader: {
        modules: [
          nodeModulesOfBuilder,
          dirnameOfBuilder,
          'node_modules'
        ]
      },

      externals: [],

      module: {
        rules: []
      },
      plugins: [],

      optimization: {
        minimizer: []
      },

      output: {},

      devServer: {
        historyApiFallback: {
          rewrites: [
          ]
        }
      }
    }

    const transformConfigs = Object.keys(buildConfig.transforms).map(
      key => {
        const [extension, context] = key.split('@')
        const transform = buildConfig.transforms[key]
        return {
          extension,
          context: context || '',
          transform,
          excludedExtensions: null,
          excludedContexts: null
        }
      }
    )

    // 处理 extension / context 冲突的 transform 项
    transformConfigs.forEach(transformConfig => {
      const { extension, context } = transformConfig

      // 若存在其他 extension 比当前 extension 更精确，则在当前项中排除之；
      // 如 css & module.css，则在 css 对应项中排除 module.css
      const extensions = transformConfigs.map(({ extension }) => extension)
      transformConfig.excludedExtensions = extensions.filter(endsWithExt(extension))

      // 若存在其他项 extension 与当前 extension 相同，而 context 更精确，则在当前项中排除之；
      // 如 svg@css & svg@module.css，则在 svg@css 对应项中排除 svg@module.css
      const contexts = transformConfigs.filter(
        targetConfig => targetConfig.extension === extension
      ).map(({ context }) => context)
      transformConfig.excludedContexts = contexts.filter(endsWithExt(context))
    })

    // add transforms
    transformConfigs.forEach(transformConfig => {
      webpackConfig = require('./addons/add-transform')(
        webpackConfig,
        { ...transformConfig, buildConfig }
      )
    })

    // 有的 transform 的添加逻辑比较特别，需要在别的添加完成后再添加，使用 post 标识
    transformConfigs.forEach(transformConfig => {
      webpackConfig = require('./addons/add-transform')(
        webpackConfig,
        { ...transformConfig, buildConfig, post: true }
      )
    })

    // define env
    webpackConfig = require('./addons/define-env')(webpackConfig, env, buildConfig.envVariables)

    // generate sourcemap
    webpackConfig = require('./addons/sourcemap')(webpackConfig)

    return webpackConfig
  }
)

function endsWithExt(ext) {
  return target => target.endsWith('.' + ext)
}
