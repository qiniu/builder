#! /usr/bin/env node

const argv = require('./argv')
const getENV = require('./get-env')
const buildFn = require('../lib')
const devFn = require('./dev')

async function main() {
  // set BUILD_ROOT
  process.env.BUILD_ROOT = argv.root || process.cwd()

  let ENV = null
  if (argv.env) {
    // 这里需不需要使用 promise
    ENV = getENV(argv.env)
  }

  process.env.ENV = JSON.stringify(ENV)

  if (argv.build) {
    buildFn(argv.upload)
  } else {
    devFn(argv.port, ENV)
  }
}

try {
  main()
} catch (error) {
  console.error(error)
}
