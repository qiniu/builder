/**
 * @file upload files
 * @author nighca <nighca@live.cn>
 */

import path from 'path'
import walk from 'walk'
import qiniu from 'qiniu'
import Mustache from 'mustache'
import logger from './utils/logger'
import { Deploy, findBuildConfig } from './utils/build-conf'
import { getDistPath } from './utils/paths'
import { getPathFromUrl } from './utils'

const logLifecycle = require('./utils').logLifecycle

// 用于识别结果文件中的 sourcemap 文件
const sourceMapPattern = /\.map$/

// https://gist.github.com/nighca/6562d098ac01814b6e1c1718b16d4abc
function batch<I, O>(process: (input: I) => Promise<O>, limit = -1) {
  return function batchProcess(tasks: I[] = []): Promise<O[]> {
    let results: O[] = [], finished = 0, current = 0
    let rejected = false

    function tryProcess(resolve: (os: O[]) => void, reject: (err: unknown) => void) {
      if (rejected) return
      if (finished >= tasks.length) return resolve(results)
      if (current >= tasks.length) return

      const index = current++
      process(tasks[index]).then(
        result => {
          results[index] = result
          finished++
          tryProcess(resolve, reject)
        },
        err => {
          reject(err)
          rejected = true
        }
      )
    }

    return new Promise((resolve, reject) => {
      const realLimit = limit > 0 ? limit : tasks.length
      for (let i = 0; i < realLimit; i++) {
        tryProcess(resolve, reject)
      }
    })
  }
}

function getAllFiles(baseDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const walker = walk.walk(baseDir)
    const files: string[] = []

    walker.on('errors', (_, stat) => {
      reject(stat[0].error)
    })

    walker.on('nodeError', (_, stat) => {
      reject(stat[0].error)
    })

    walker.on('directoryError', (_, stat) => {
      reject(stat[0].error)
    })

    walker.on('files', (root, stats, next) => {
      stats.forEach(
        stat => files.push(
          path.relative(baseDir, path.join(root, stat.name))
        )
      )
      next()
    })

    walker.on('end', () => {
      resolve(files)
    })
  })
}

async function runWithRetry<T>(process: () => T, retryTime = 3): Promise<T> {
  let error = null
  while (retryTime-- > 0) {
    try {
      return await process()
    } catch (e) {
      error = e
    }
  }
  throw error
}

async function uploadFile(localFile: string, bucket: string, key: string, mac: qiniu.auth.digest.Mac) {
  const options = {
    scope: bucket + ':' + key
  }
  const putPolicy = new qiniu.rs.PutPolicy(options)
  const uploadToken = putPolicy.uploadToken(mac)
  const putExtra = new qiniu.form_up.PutExtra()
  const config = new qiniu.conf.Config()
  const formUploader = new qiniu.form_up.FormUploader(config)

  const putFile = () => new Promise<void>((resolve, reject) => {
    formUploader.putFile(uploadToken, key, localFile, putExtra, (err, ret) => {
      if(err || ret.error) {
        reject(err || ret.error)
        return
      }
      resolve()
    })
  })

  return runWithRetry(putFile, 3)
}

function getDeployConfig(deploy: Deploy) {
  const { config } = deploy
  const model = {
    process: {
      env: process.env
    }
  }

  return (Object.keys(config) as Array<keyof Deploy['config']>).reduce((prev, curr) => {
    prev[curr] = Mustache.render(config[curr], model)
    return prev
  }, {} as Deploy['config'])
}

async function upload() {
  const buildConfig = await findBuildConfig()
  const { deploy, publicUrl } = buildConfig
  const distPath = getDistPath(buildConfig)
  const prefix = getPathFromUrl(publicUrl, false)
  const { accessKey, secretKey, bucket } = getDeployConfig(deploy)

  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
  const files = await getAllFiles(distPath)

  const concurrentLimit = 50
  const batchUploadFile = batch(async (name: string) => {
    const key = prefix ? `${prefix}/${name}` : name
    const filePath = path.resolve(distPath, name)

    // 排除 sourcemap 文件，不要上传到生产环境 CDN
    if (sourceMapPattern.test(filePath)) {
      return logger.info(`[IGNORE] ${filePath}`)
    }

    await uploadFile(filePath, bucket, key, mac)
    logger.info(`[UPLOAD] ${filePath} -> ${key}`)
  }, concurrentLimit)

  await batchUploadFile(files)
  logger.info(`[UPLOAD] ${files.length} files with concurrent limit ${concurrentLimit}`)
}

export default logLifecycle('Upload', upload, logger)
