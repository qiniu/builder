/**
 * @file logger
 * @author nighca <nighca@live.cn>
 */

import { getLogger } from 'log4js'

const logger = getLogger('FEC')
logger.level = process.env.verbose ? 'debug' : 'info'

export default logger
