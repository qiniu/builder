/*
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

const getAllFiles = (baseDir) => {
  return new Promise((resolve, reject) => {
    const walker = walk.walk(baseDir)
    const files = []

    walker.on('error', (root, stat, next) => {
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

const uploadFile = ({ localFile, bucket, key }) => new Promise(
  (resolve, reject) => {
    const putPolicy = new qiniu.rs.PutPolicy(bucket + ':' + key)
    const token = putPolicy.token()
    const extra = new qiniu.io.PutExtra()

    qiniu.io.putFile(token, key, localFile, extra, (err, ret) => {
      if(err) {
        reject(err)
        return
      }
      resolve(ret)
    })
  }
).then(
  () => logger.info(`[UPLOAD] ${localFile} -> ${key}`)
)

const batchUpload = batch(uploadFile, 10)

const upload = () => findBuildConfig().then(
  buildConfig => {
    const deployConfig = buildConfig.deploy.config
    const distPath = paths.getDistPath(buildConfig)
    const prefix = getPathFromUrl(buildConfig.publicUrl, false)

    qiniu.conf.ACCESS_KEY = deployConfig.accessKey
    qiniu.conf.SECRET_KEY = deployConfig.secretKey

    return Promise.all([
      distPath,
      deployConfig,
      prefix,
      getAllFiles(distPath)
    ])
  }
).then(
  ([distPath, deployConfig, prefix, files]) => {
    const items = files.map(name => {
      const key = prefix ? `${prefix}/${name}` : name
      const filePath = path.resolve(distPath, name)

      // 排除 sourcemap 文件，不要上传到生产环境 CDN
      if (sourceMapPattern.test(filePath)) {
        return null
      }

      return {
        localFile: filePath,
        bucket: deployConfig.bucket,
        key: key
      }
    }).filter(Boolean)
    return batchUpload(items)
  }
)

module.exports = logLifecycle('upload', upload, logger)
