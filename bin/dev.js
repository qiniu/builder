const path = require('path')
const child_process = require('child_process')

function dev(port, ENV) {
  const webpackDevServerFile = path.resolve(
    path.dirname(require.resolve('webpack-dev-server/package.json')),
    'bin/webpack-dev-server.js'
  )
  
  const configFile = path.resolve(
    __dirname,
    '../lib/webpack-config/index.js'
  )
  
  const args = [
    webpackDevServerFile,
    '--hot',
    '--inline',
    '--port', port,
    '--host', '0.0.0.0',
    '--public', '0.0.0.0:' + port,
    '--config', configFile
  ]
  
  const options = {
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'development',
      BUILD_ROOT: process.cwd(),
      FORCE_COLOR: true,
      ENV: JSON.stringify(ENV)
    },
    shell: true,
    stdio: 'inherit'
  }
  
  const devServer = child_process.spawn(
    process.argv[0],
    args,
    options,
    (err, stdout, stderr) => {
      if (err) {
        console.error('execFile failed: ', err)
        process.exit(1)
        return
      }
    }
  )
}

module.exports = dev
