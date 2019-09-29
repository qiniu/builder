/**
 * @file config for define env
 * @author nighca <nighca@live.cn>
 */

const _ = require('lodash')
const webpack = require('webpack')
const update = require('immutability-helper')

module.exports = (config, buildEnv, envVariables) => {
  // 基于 buildEnv 添加默认的 `process.env.NODE_ENV`
  // 很多第三方库依赖该环境变量决定自己的行为
  envVariables = _.extend({
    'process.env.NODE_ENV': buildEnv
  }, envVariables)

  // webpack DefinePlugin 只是简单的文本替换，这里强制做转换
  envVariables = _.mapValues(envVariables, JSON.stringify)

  return update(config, {
    plugins: { $push: [
      new webpack.DefinePlugin(envVariables)
    ] }
  })
}
