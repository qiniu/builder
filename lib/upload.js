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

const uploadFile = (localFile, bucket, key, mac) => new Promise(
  (resolve, reject) => {
    const options = {
      scope: bucket + ':' + key
    }
    const putPolicy = new qiniu.rs.PutPolicy(options)
    const uploadToken = putPolicy.uploadToken(mac)
    const putExtra = new qiniu.form_up.PutExtra()
    const config = new qiniu.conf.Config()
    const formUploader = new qiniu.form_up.FormUploader(config)

    formUploader.putFile(uploadToken, key, localFile, putExtra, (err, ret) => {
      if(err) {
        reject(err)
        return
      }
      resolve(ret)
    })
  }
)

const upload = () => findBuildConfig().then(
  buildConfig => {
    const deployConfig = buildConfig.deploy.config
    const distPath = paths.getDistPath(buildConfig)
    const prefix = getPathFromUrl(buildConfig.publicUrl, false)

    const mac = new qiniu.auth.digest.Mac(deployConfig.accessKey, deployConfig.secretKey)

    return Promise.all([
      distPath,
      deployConfig,
      prefix,
      mac,
      getAllFiles(distPath)
    ])
  }
).then(
  ([distPath, deployConfig, prefix, mac, files]) => Promise.all(
    files.map(name => {
      const key = prefix ? `${prefix}/${name}` : name
      const filePath = path.resolve(distPath, name)

      // 排除 sourcemap 文件，不要上传到生产环境 CDN
      if (sourceMapPattern.test(filePath)) {
        return logger.info(`[IGNORE] ${filePath}`)
      }

      return uploadFile(
        filePath,
        deployConfig.bucket,
        key,
        mac
      ).then(
        () => logger.info(`[UPLOAD] ${filePath} -> ${key}`)
      )
    })
  )
)

module.exports = logLifecycle('Upload', upload, logger)
