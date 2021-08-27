/**
 * @file run unit test
 * @author nighca <nighca@live.cn>
 */

import logger from './utils/logger'
import { logLifecycle } from './utils'

async function test() {
  throw new Error('Command test is not supported yet')
}

export default logLifecycle('Test', test, logger)
