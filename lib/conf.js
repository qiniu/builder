/*
 * @file config
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const utils = require('./utils')
const config = require('../config.json')
const defaults = require('./default-config.json')

const mergeConfig = (cfg1, cfg2) => {
  return utils.extend({}, cfg1, cfg2, {
    optimization: utils.extend({}, cfg1.optimization, cfg2.optimization),
    transforms: utils.extend({}, cfg1.transforms, cfg2.transforms)
  })
}

module.exports = {
  fetch() {
    return Promise.resolve(mergeConfig(defaults, config))
  }
}
