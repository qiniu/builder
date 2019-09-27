/**
 * @file logger
 * @author nighca <nighca@live.cn>
 */

const logger = require('log4js').getLogger('FEC')

logger.level = process.env.verbose ? 'debug' : 'info'

module.exports = logger
