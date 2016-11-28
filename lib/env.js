/*
 * @file env info
 * @author nighca <nighca@live.cn>
 */

const env = process.env.NODE_ENV || 'development'

console.info(`env: ${env}`)

module.exports = env
