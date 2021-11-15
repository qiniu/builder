/**
 * @file svgo utils
 * @desc svgo 配置相关逻辑
 */

import { createHash } from 'crypto'

// `prefixIds` 通过给 SVG 中的 id 值添加 hash 作为前缀，
// 以避免不同 SVG 文件同时被 inline 到 DOM 中时产生的定义冲突
const prefixIdsConfig = {
  // https://github.com/svg/svgo/blob/v1.3.2/plugins/prefixIds.js#L126
  prefix: (_node: any, info: any) => {
    // `info.path` 值是 svg 文件的绝对路径
    const hash = createHash('sha1').update(info.path).digest('base64') // TODO: maybe with cache?
    return hash.replace(/[^\w]/g, '').slice(0, 10)
  }
}

/**
 * 对 svgo 的配置（用于 svgr，对应 svgo 1.x）
 * 目前使用的 svgr 版本依赖 svgo 1.x，而 imagemin 依赖 svgo 2.x，二者配置格式不同，
 * 因此这里分别维护之：`getSvgoConfigForSvgr` & `svgoConfigForImagemin`；
 * TODO: 待 svgr 正式版依赖 svgo 2.x 后，升级 svgr，这里可以统一二者关于 svgo 的配置（`prefixIds` 除外）
 */
export function getSvgoConfigForSvgr(compress: boolean) {
  if (!compress) {
    return {
      full: true, // 干掉 svgo 的默认配置 https://github.com/svg/svgo/blob/v1.3.2/lib/svgo/config.js#L23-L29
      plugins: [{ prefixIds: prefixIdsConfig }] // 只做 `prefixIds` 的事情（`prefixIds` 会影响展示的正确性）
    }
  }
  return {
    full: true, // 干掉 svgo 的默认配置 https://github.com/svg/svgo/blob/v1.3.2/lib/svgo/config.js#L23-L29
    plugins: [
      // 注意这里格式上不能写成 `['cleanupAttrs', 'removeDoctype', ...]`，
      // 那样经过 @svgr/plugin-svgo 处理后的配置中 `plugins` 值会不对
      { cleanupAttrs: true },
      { removeDoctype: true },
      { removeXMLProcInst: true },
      { removeComments: true },
      { removeMetadata: true },
      { removeTitle: true },
      { removeDesc: true },
      { removeUselessDefs: true },
      { removeEditorsNSData: true },
      { removeEmptyAttrs: true },
      { removeHiddenElems: true },
      { removeEmptyText: true },
      { removeEmptyContainers: true },
      { cleanupEnableBackground: true },
      { minifyStyles: true },
      { convertColors: true },
      { convertPathData: true },
      { convertTransform: true },
      { removeUnusedNS: true },
      { cleanupIDs: {
        // 注意这里如果开启 minify，需要确保 plugin `cleanupIDs` 在 plugin `prefixIds` 前执行
        // 否则 `prefixIds` 的结果会被 `cleanupIDs` minify 给改掉，失去 prefix 的效果
        // 因为这里 svgr 通过 @svgr/plugin-svgo 处理 svgo 配置，其默认配置逻辑（ https://github.com/gregberge/svgr/blob/v5.5.0/packages/plugin-svgo/src/config.js#L9 ）
        // 会导致 plugin `prefixIds` 最终总会被放到最前面，对应地执行于 plugin `cleanupIDs` 之前
        // 因此这里先把 minify 关掉
        minify: false,
        remove: true
      } },
      { prefixIds: prefixIdsConfig },
      { cleanupNumericValues: true },
      { collapseGroups: true },
      { mergePaths: true }
    ]
  }
}

/** 对 svgo 的配置（用于 imagemin，对应 svgo 2.x） */
export const svgoConfigForImagemin = {
  plugins: [
    'cleanupAttrs',
    'mergeStyles',
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeTitle',
    'removeDesc',
    'removeUselessDefs',
    'removeEditorsNSData',
    'removeEmptyAttrs',
    'removeHiddenElems',
    'removeEmptyText',
    'removeEmptyContainers',
    'cleanupEnableBackground',
    'minifyStyles',
    'convertColors',
    'convertPathData',
    'convertTransform',
    'removeUnusedNS',
    'cleanupIDs',
    'cleanupNumericValues',
    'collapseGroups',
    'mergePaths'
  ]
}
