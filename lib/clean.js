/*
 * @file clean dist
 * @author nighca <nighca@live.cn>
 */

const del = require('del')

const paths = require('./utils/paths')
const logger = require('./utils/logger')
const logLifecycle = require('./utils').logLifecycle
const findBuildConfig = require('./utils/build-conf').find

const clean = () => findBuildConfig().then(
  buildConfig => {
    const dist = paths.getDistPath(buildConfig)
    logger.debug(`clean dist: ${dist}`)

    return del(dist, { force: true })
  }
)

module.exports = logLifecycle('clean', clean, logger)
