/**
 * @file clean dist
 * @author nighca <nighca@live.cn>
 */

import del from 'del'

import { getDistPath } from './utils/paths'
import logger from './utils/logger'
import { logLifecycle } from './utils'
import { findBuildConfig } from './utils/build-conf'
import { getNeedCache, getCachePath } from './utils/paths'

async function clean() {
  const buildConfig = await findBuildConfig()
  const dist = getDistPath(buildConfig)
  logger.debug(`clean dist: ${dist}`)
  await del(dist, { force: true })

  // delete webpack persistent cache directory
  if (getNeedCache()) {
    const cacheDir = getCachePath()
    logger.debug(`clean cache: ${cacheDir}`)
    await del(cacheDir, { force: true })
  }
}

export default logLifecycle('Clean', clean, logger)
