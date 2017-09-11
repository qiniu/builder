const yargs = require('yargs')

const argv = yargs
  .option('p', {
    alias: 'port',
    describe: 'string: dev server port',
    default: '80'
  })
  .option('b', {
    alias: 'build',
    describe: 'bool: build the program',
    default: false
  })
  .option('e', {
    alias: 'env',
    describe: 'string: set the env config in global ENV in path /env',
    default: ''
  })
  .option('r', {
    alias: 'root',
    describe: 'BUILD_ROOT'
  })
  .option('u', {
    alias: 'upload',
    describe: 'upload to qiniu'
  })
  .help('h')
  .alias('h', 'help')
  .locale('en')
  .argv

  module.exports = argv
