/*
 * @file webpack config for development
 * @author nighca <nighca@live.cn>
 */

const getCommonConfig = require('./common')

const fs = require('fs')
const paths = require('../utils/paths')
const update = require('immutability-helper')

module.exports = () => getCommonConfig().then(
  config => {
    config = require('./addons/sourcemap')(config)
    config = require('./addons/fork-ts-checker-webpack-plugin')(config)
    
    const webpackConfigFilePath = paths.getWebpackConfigFilePath()
    if (!!webpackConfigFilePath) {
      const configFileRawContent = fs.readFileSync(webpackConfigFilePath, { encoding: 'utf8' })
      const configFileContent = JSON.parse(configFileRawContent)
      config = update(config, {
        $merge: configFileContent
      })
    }

    return config
  }
)
