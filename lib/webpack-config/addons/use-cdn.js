/*
 * @file config for using cdn
 * @author nighca <nighca@live.cn>
 */

module.exports = (config, cdnPath) => {
  config.output.publicPath = cdnPath
  return config
}
