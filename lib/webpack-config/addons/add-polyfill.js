/**
 * @file add polyfill
 * @author Surmon <i@surmon.me>
 */

const path = require('path')
const update = require('immutability-helper')
const VirtualModulesPlugin = require('webpack-virtual-modules')

const buildEnv = require('../../utils/build-env')
const chunks = require('../../constants/chunks')
const { isGlobalPolyfill } = require('../../constants/polyfill')

module.exports = (webpackConfig, srcDir, srcPath, { addPolyfill }) => {
  const isProdEnv = buildEnv.get() === buildEnv.prod

  if (!isGlobalPolyfill(addPolyfill) || !isProdEnv) {
    return webpackConfig
  }

  const mockFile = `${chunks.polyfill}.js`

  return update(webpackConfig, {
    entry: {
      $merge: {
        /**
         * 此处有两点需求：
         * 1. 经过反复测试和确认，Babel 似乎认工作路径，如果 polyfill 与项目程序本身的路径不一致，则 useBuiltIns 失效
         * 2. 所以只能造一个假的路径为项目路径的虚拟文件，以模拟 '/xxx/project/src/polyfill.js'
         * 3. VirtualModulesPlugin 插件目前可确认的最高支持在 Webpack v4，如果后期升级 Webpack 则需检测此处
         X `[chunks.polyfill]: 'core-js'` -> 无法被 Babel 理解并替换
         X `path.resolve(__dirname, ... 'polyfill.js')` -> 无法产出合乎预期的包，始终为全量的 polyfill
        */
        [chunks.polyfill]: path.resolve(srcPath, mockFile)
      }
    },
    plugins: {
      $push: [
        new VirtualModulesPlugin({
          [
            path.join('./', srcDir, '/') + mockFile
          ]: (
            `
            require('core-js/stable')
            require('regenerator-runtime/runtime')
            `
          )
        })
      ]
    }
  })
}
