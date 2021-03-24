/**
 * @file util methods
 * @author nighca <nighca@live.cn>
 */

import { Logger } from 'log4js'
import { parse as parseUrl } from 'url'

export function extend<T extends Record<string, any>>(...addons: Array<Partial<T> | null | undefined>): Partial<T> {
  const target: Partial<T> = {}
  addons.forEach(addon => {
    for (let key in addon) {
      if (addon.hasOwnProperty(key)) {
        target[key] = addon[key]!
      }
    }
  })
  return target
}

const durationHumanizeSteps = [
  { unit: 'day', amount: 1000 * 60 * 60 * 24 },
  { unit: 'hour', amount: 1000 * 60 * 60 },
  { unit: 'min', amount: 1000 * 60 },
  { unit: 's', amount: 1000 },
  { unit: 'ms', amount: 1 }
]

function getDurationFrom(startAt: number) {
  const duration = Date.now() - startAt
  if (duration < 1) {
    return '0ms'
  }
  const result = durationHumanizeSteps.reduce<[string[], number]>(([parts, duration], { unit, amount }) => {
    if (duration >= amount) {
      parts.push(`${Math.floor(duration / amount)}${unit}`)
      duration = duration % amount
    }
    return [parts, duration]
  }, [[], duration])
  return result[0].join(' ')
}

/** log behavior lifecycle */
export function logLifecycle<T extends Array<any>, P>(
  /** behavior name */
  name: string,
  /** target method */
  method: (...args: T) => P,
  logger: Logger
) {
  return async (...args: T) => {
    logger.info(`${name} start`)
    const startAt = Date.now()
    try {
      const result = await method(...args)
      logger.info(`${name} succeeded, costs: ${getDurationFrom(startAt)}`)
      return result
    } catch (e) {
      logger.error(`${name} failed:`, e)
      throw e
    }
  }
}

/** get prefix part from url */
export function getPathFromUrl(
  targetUrl: string,
  /** if with slash at begining & ending */
  withSlash = true
) {
  const parsed = parseUrl(targetUrl)
  const pathWithoutSlash = (parsed.pathname || '').replace(/^\/|\/$/g, '')
  return (
    withSlash
    ? (pathWithoutSlash ? `/${pathWithoutSlash}/` : '/')
    : pathWithoutSlash
  )
}

/** check isImage by extension */
export function isImage(extension: string) {
  // svg 有可能是字体文件，且 svg 作为图片时本身压缩空间小，暂不做处理
  return ['png', 'jpg', 'jpeg', 'gif'].some(
    type => type === extension
  )
}

/** remove suffix in filePath */
export function removeSuffix(filePath: string) {
  return filePath.replace(/\.\w+$/, '')
}

function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/** make regexp test for test files */
export function makeTestRegexpText(extensions: string[]) {
  return `\\.spec\\.(${extensions.map(escapeRegExp).join('|')})$`
}

/** make glob for test files (under build root) */
export function makeTestGlob(srcDir: string, extensions: string[]) {
  if (extensions.length === 0) {
    throw new Error('at least one extension required')
  }
  if (extensions.length === 1) {
    const extension = extensions[0]
    return `${srcDir}/**/*.spec.${extension}`
  }
  const extensionsText = extensions.join('|')
  return `${srcDir}/**/*.spec.@(${extensionsText})`
}

/** make glob for snapshot glob (under build root) */
export function makeSnapshotGlob(srcDir: string) {
  return `${srcDir}/**/*.snap`
}

/** 从 page 名（buildConfig.pages 的 key）得到在 serve / 构建时对应的页面文件名  */
export function getPageFilename(pageName: string) {
  return `${pageName}.html`
}

// TODO
// export function getDefaultExtensions(webpackConfig) {
//   return webpackConfig.resolve.extensions.map(
//     extension => extension.replace(/^\./, '')
//   )
// }

// TODO
// function runWebpackCompiler(compiler) {
//   return new Promise((resolve, reject) => {
//     compiler.run((err, stats) => {
//       if (err || stats.hasErrors()) {
//         reject(err || stats.toJson().errors)
//         return
//       }
//       resolve(stats)
//     })
//   })
// }
