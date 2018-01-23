/*
 * @file prepare behaviors
 * @author nighca <nighca@live.cn>
 */

const semver = require('semver')
const logger = require('./utils/logger')
const findBuildConfig = require('./utils/build-conf').find
const packageInfo = require('../package.json')

module.exports = () => findBuildConfig().then(
  buildConfig => {
    const builderVersionRange = buildConfig.engines && buildConfig.engines.builder
    if (typeof builderVersionRange === 'string') {
      const builderVersion = packageInfo.version
      if (!semver.satisfies(builderVersion, builderVersionRange)) {
        logger.warn(`builder version not satisfied, which may causes error (expected \`${builderVersionRange}\`, got \`${builderVersion}\`)`)
      }
    }
  }
)
