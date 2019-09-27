/**
 * @file add polyfill
 * @author Surmon <i@surmon.me>
 */

const path = require('path')
const update = require('immutability-helper')
const VirtualModulePlugin = require('virtual-module-webpack-plugin')
const chunks = require('../../constants/chunks')

module.exports = (webpackConfig, srcDir, srcPath, { addPolyfill }) => {
  if (!addPolyfill) {
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
         * 3. VirtualModulePlugin 插件目前可确认的兼容性在 Webpack 1~4，如果后期升级 Webpack 则需检测此处
         X `[chunks.polyfill]: '@babel/polyfill'` -> 无法被 Babel 理解并替换
         X `path.resolve(__dirname, ... 'polyfill.js')` -> 无法产出合乎预期的包，始终为全量的 polyfill
        */
        [chunks.polyfill]: path.resolve(srcPath, mockFile)
      }
    },
    plugins: {
      $push: [
        new VirtualModulePlugin({
          moduleName: path.join('./', srcDir, '/') + mockFile,
          contents: `require('@babel/polyfill')`,
        })
      ]
    }
  })
}
