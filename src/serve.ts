/**
 * @file serve as dev server
 * @author nighca <nighca@live.cn>
 */

import logger from './utils/logger'
const logLifecycle = require('./utils').logLifecycle

async function serve() {}

export default logLifecycle('Serve', serve, logger)
