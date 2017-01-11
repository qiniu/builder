/*
 * @file config
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const utils = require('./utils')
const paths = require('./paths')

const mergeConfig = (cfg1, cfg2) => {
  return utils.extend({}, cfg1, cfg2, {
    optimization: utils.extend({}, cfg1.optimization, cfg2.optimization),
    transforms: utils.extend({}, cfg1.transforms, cfg2.transforms),
    deploy: utils.extend({}, cfg1.deploy, cfg2.deploy)
  })
}

const getPresetConfig = name => {
  // TODO: 重新实现
  return Promise.resolve(
    require(`../preset-configs/${name}.json`)
  )
}

const getConfig = nameOrPath => {
  // TODO: 查找策略：判断是 name / path，判断是预设规则还是外部 config
  return getPresetConfig(nameOrPath).then(
    presetConfig => completeConfig(presetConfig)
  )
}

const completeConfig = config => {
  const extendsTarget = config.hasOwnProperty('extends') ? config['extends'] : 'default'
  if (!extendsTarget) {
    return Promise.resolve(config)
  }
  return getConfig(extendsTarget).then(
    extendsConfig => mergeConfig(extendsConfig, config)
  )
}

const configFilePath = paths.abs('config.json')

module.exports = completeConfig(require(configFilePath))
