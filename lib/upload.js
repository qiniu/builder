/*
 * @file 
 * @author nighca <nighca@live.cn>
 */

const url = require('url')
const path = require('path')
const walk = require('walk')
const qiniu = require('qiniu')

const paths = require('./paths')

const getAllFiles = (baseDir) => {
  return new Promise((resolve, reject) => {
    const options = {}
    const walker = walk.walk(baseDir, options)
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

const uploadFile = (localFile, bucket, key) => new Promise(
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
)

module.exports = () => require('./conf').then(
  projectConfig => {
    const deployConfig = projectConfig.deploy.config
    const projectPaths = paths.getPaths(projectConfig)
    const publicUrl = url.parse(projectConfig.publicUrl)
    const prefix = publicUrl.pathname.replace(/^\//, '').replace(/\/$/, '')

    qiniu.conf.ACCESS_KEY = deployConfig.accessKey
    qiniu.conf.SECRET_KEY = deployConfig.secretKey

    return Promise.all([
      projectPaths,
      deployConfig,
      prefix,
      getAllFiles(projectPaths.dist)
    ])
  }
).then(
  ([projectPaths, deployConfig, prefix, files]) => Promise.all(
    files.map(
      name => {
        const key = prefix ? `${prefix}/${name}` : name
        const filePath = path.resolve(projectPaths.dist, name)
        return uploadFile(
          filePath,
          deployConfig.bucket,
          name
        )
      }
    )
  )
)
