/**
 * @file upload files
 * @author nighca <nighca@live.cn>
 */

const path = require('path')
const walk = require('walk')
const qiniu = require('qiniu')

const paths = require('./utils/paths')
const logger = require('./utils/logger')
const logLifecycle = require('./utils').logLifecycle
const getPathFromUrl = require('./utils').getPathFromUrl
const findBuildConfig = require('./utils/build-conf').find

const sourceMapPattern = require('./webpack-config/addons/sourcemap').pattern

// https://gist.github.com/nighca/6562d098ac01814b6e1c1718b16d4abc
function batch(process, limit = -1) {
  return function batchProcess(tasks = []) {
    let results = [], finished = 0, processing = 0
    let rejected = false

    function tryProcess(resolve, reject) {
      if (rejected) return
      if (finished >= tasks.length) {
        resolve(results)
        return
      }

      const offset = finished + processing
      const todo = limit > 0 ? limit - processing : tasks.length
      tasks.slice(offset, offset + todo).forEach((task, i) => {
        processing++
        process(task).then(
          result => {
            results[offset + i] = result
            processing--
            finished++
            tryProcess(resolve, reject)
          },
          err => {
            reject(err)
            rejected = true
          }
        )
      })
    }

    return new Promise(tryProcess)
  }
}

function getAllFiles(baseDir) {
  return new Promise((resolve, reject) => {
    const walker = walk.walk(baseDir)
    const files = []

    walker.on('error', (_, stat) => {
      reject(stat.error)
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

async function runWithRetry(process, retryTime = 3) {
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

async function uploadFile(localFile, bucket, key, mac) {
  const options = {
    scope: bucket + ':' + key
  }
  const putPolicy = new qiniu.rs.PutPolicy(options)
  const uploadToken = putPolicy.uploadToken(mac)
  const putExtra = new qiniu.form_up.PutExtra()
  const config = new qiniu.conf.Config()
  const formUploader = new qiniu.form_up.FormUploader(config)

  const putFile = () => new Promise((resolve, reject) => {
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

async function upload() {
  const buildConfig = await findBuildConfig()
  const deployConfig = buildConfig.deploy.config
  const distPath = paths.getDistPath(buildConfig)
  const prefix = getPathFromUrl(buildConfig.publicUrl, false)
  const mac = new qiniu.auth.digest.Mac(deployConfig.accessKey, deployConfig.secretKey)
  const files = await getAllFiles(distPath)

  const concurrentLimit = 50
  const batchUploadFile = batch(async name => {
    const key = prefix ? `${prefix}/${name}` : name
    const filePath = path.resolve(distPath, name)

    // 排除 sourcemap 文件，不要上传到生产环境 CDN
    if (sourceMapPattern.test(filePath)) {
      return logger.info(`[IGNORE] ${filePath}`)
    }

    await uploadFile(filePath, deployConfig.bucket, key, mac)
    logger.info(`[UPLOAD] ${filePath} -> ${key}`)
  }, concurrentLimit)

  await batchUploadFile(files)
  logger.info(`[UPLOAD] ${files.length} files with concurrent limit ${concurrentLimit}`)
}

module.exports = logLifecycle('Upload', upload, logger)
