/**
 * @file generate dist files
 * @author nighca <nighca@live.cn>
 */

import logger from './utils/logger'
import { loadRspackCore } from './utils/rspack-esm'
import { logLifecycle } from './utils'
import { getConfig } from './webpack'

async function generate() {
  const { rspack } = await loadRspackCore()
  const config = await getConfig()

  logger.debug('rspack config:', config)

  return new Promise<void>((resolve, reject) => {
    rspack(config, (err, stats) => {
      if (err) {
        reject(err)
        return
      }
      if (stats && stats.hasErrors()) {
        reject(stats.toJson().errors)
        return
      }
      resolve()
    })
  })
}

export default logLifecycle('Generate', generate, logger)
