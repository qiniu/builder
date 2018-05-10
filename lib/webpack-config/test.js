/*
 * @file webpack config for test
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const glob = require('glob')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const getTestCommonConfig = require('./test-common')
const utils = require('../utils')
const paths = require('../utils/paths')
const logger = require('../utils/logger')
const buildEnv = require('../utils/build-env')
const findBuildConfig = require('../utils/build-conf').find

// TODO: 参考 lib/webpack-config/addons/add-transform.js 中
// “针对后缀为 js 的 transform，控制范围（不对依赖做转换）”
// const whiteList = ['react-icecream', 'portal-base', 'perfect-scrollbar']

// TODO: 测试挂掉 exit code 应该是 1
module.exports = (getCompiler) => Promise.all([
  findBuildConfig(),
  getTestCommonConfig()
]).then(
  ([buildConfig, webpackConfig]) => {
    const env = buildEnv.get()

    const projectPaths = {
      root: paths.getBuildRoot(),
      src: paths.getSrcPath(buildConfig),
      dist: paths.getDistPath(buildConfig),
      test: paths.abs('.test'),
      dep: paths.abs('node_modules')
    }

    const transformIncludes = buildConfig.transformIncludes || []

    webpackConfig.externals.unshift(function(context, request, callback) {
      const resolver = getCompiler().resolvers.normal
      resolver.resolve({}, context, request, (err, filePath) => {
        if (err != null) {
          return callback()
        }

        // from node_modules of the project, then mark it as external
        if (
          filePath.startsWith(projectPaths.dep)
          && !transformIncludes.some(
            packageName => inPackage(filePath, path.join(projectPaths.dep, packageName))
          )
        ) {
          return callback(null, `commonjs2 ${request}`)
        }
        callback()
      })
    })

    const testConfig = buildConfig.test

    const defaultExtensions = utils.getDefaultExtensions(webpackConfig)
    const testGlob = utils.makeTestGlob(buildConfig.srcDir, defaultExtensions)
    const testFiles = glob.sync(testGlob, { cwd: projectPaths.root })

    const setupFiles = (testConfig.setupFiles || []).map(
      setupFile => paths.abs(setupFile)
    )

    webpackConfig.entry = testFiles.reduce((entries, testFilePath) => {
      entries[testFilePath] = [
        ...setupFiles,
        path.join(projectPaths.root, testFilePath)
      ]
      return entries
    }, {})

    webpackConfig.plugins.push(
      new CopyWebpackPlugin([
        {
          from: utils.makeSnapshotGlob(buildConfig.srcDir),
          to: projectPaths.test,
        }
      ], {
        debug: logger.level === 'debug' ? 'info' : 'warning',
        context: projectPaths.root
      })
    )

    return webpackConfig
  }
)

/**
 * @desc check if file is in given package (in node_modules)
 * @param  {string} filePath - path of file
 * @param  {string} packageName - package name (such as 'react', ...)
 * @return {boolean}
 */
function inPackage(filePath, packagePath) {
  return (
    filePath === packagePath
    || filePath.startsWith(packagePath + '/')
  )
}
