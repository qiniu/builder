import { produce } from 'immer'
import { Configuration, WebpackPluginInstance } from 'webpack'

/** 向配置中追加 plugin */
export function appendPlugins(config: Configuration, ...plugins: Array<WebpackPluginInstance | null | undefined>) {
  return produce(config, newConfig => {
    newConfig.plugins = newConfig.plugins || []
    for (const plugin of plugins) {
      if (plugin != null) {
        newConfig.plugins.push(plugin)
      }
    }
  })
}
