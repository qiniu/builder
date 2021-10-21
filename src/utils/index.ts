/**
 * @file util methods
 * @author nighca <nighca@live.cn>
 */

import fs from 'fs'
import { debounce } from 'lodash'
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
  // 支持一下 `./` 形式的 url，暂不考虑 `../` 的情况
  targetUrl = targetUrl.replace(/^\.\//, '\/')
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

/** 监听文件内容变化，会对内容做比对，适用于体积较小的文本文件 */
export function watchFile(filePath: string, listener: (content: string) => void) {

  function readFile() {
    return fs.readFileSync(filePath, { encoding: 'utf-8' })
  }

  let previousCnt = readFile()

  // 1. debounce 是因为有时候可能会在短时间内触发多次变更事件，这里做下合并
  // 2. 比较文件内容是因为触发变更事件时文件的内容可能没有其实没有变化，这里假设使用方只关心内容的变化
  const onChange = debounce(() => {
    const currentCnt = readFile()
    if (previousCnt !== currentCnt) {
      previousCnt = currentCnt
      listener(currentCnt)
    }
  }, 100)

  const fsWatcher = fs.watch(filePath)
  fsWatcher.on('change', onChange)
  return () => fsWatcher.close()
}
