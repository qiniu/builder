/*
 * @file sourcemap config
 * @author nighca <nighca@live.cn>
 */

const update = require('immutability-helper')
const buildEnv = require('../../utils/build-env')

module.exports = config => {

  // 不同的 env 下使用不同的 sourcemap 配置
  // 不同 sourcemap 生成方式的区别见 https://webpack.js.org/configuration/devtool/

  if (buildEnv.get() === buildEnv.dev) {
    return update(config, {
      devtool: {
        $set: 'eval-source-map'
      }
    })
  }

  if (buildEnv.get() === buildEnv.prod) {
    return update(config, {
      devtool: {
        $set: 'hidden-source-map'
      }
    })
  }

  return config
}

// 用于识别结果文件中的 sourcemap 文件
module.exports.pattern = /\.map$/
