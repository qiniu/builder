/**
 * @file use chunkhash config
 * @author nighca <nighca@live.cn>
 */

module.exports = config => {
  config.output.filename = 'static/[name]-[chunkhash].js'
  return config
}
