/*
 * @file run unit test
 * @author nighca <nighca@live.cn>
 */

const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const webpack = require('webpack')
const jest = require('jest-cli')

const utils = require('./utils')
const paths = require('./utils/paths')
const logger = require('./utils/logger')
const logLifecycle = require('./utils').logLifecycle
const findBuildConfig = require('./utils/build-conf').find
const buildEnv = require('./utils/build-env')

const test = () => {
  buildEnv.set(buildEnv.test)

  let testCompiler

  return Promise.all([
    findBuildConfig(),
    require('./webpack-config')(() => testCompiler)
  ]).then(
    ([buildConfig, testWebpackConfig]) => {

      testCompiler = webpack(testWebpackConfig)

      const testConfig = buildConfig.test
      const compileTasks = [utils.runWebpackCompiler(testCompiler)]

      return Promise.all(compileTasks).then(
        () => ({ buildConfig, testWebpackConfig })
      )
    }
  ).then(
    ({ buildConfig, testWebpackConfig }) => {

      const testConfig = buildConfig.test

      const defaultExtensions = utils.getDefaultExtensions(testWebpackConfig)

      const jestConfig = utils.extend({
        testRegex: utils.makeTestRegexpText(defaultExtensions),
        moduleFileExtensions: defaultExtensions,
        // TODO: 也用 webpack 实现？
        moduleNameMapper: _.mapValues(
          testConfig.moduleNameMapper,
          file => paths.abs(file)
        )
      })

      logger.debug('jest config: ')
      logger.debug(jestConfig)

      fs.writeFileSync(
        path.join(testWebpackConfig.output.path, 'jest.config.js'),
        'module.exports = ' + JSON.stringify(jestConfig)
      )

      return jest.runCLI({}, [testWebpackConfig.output.path])
    }
  ).then(
    testResult => {
      // TODO: 依据 testResult 中的 snapshot 信息决定是不是将 snapshot 拷回去
      if (!(testResult && testResult.results && testResult.results.success)) {
        return Promise.reject('')
      }
    }
  )
}

module.exports = logLifecycle('test', test, logger)
