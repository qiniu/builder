#! /usr/bin/env node

import { setAutoFreeze } from 'immer'
import yargs from 'yargs'

import { setBuildRoot, setBuildConfigFilePath } from './utils/paths'
import { Env, setEnv } from './utils/build-env'
import logger from './utils/logger'
import { setNeedAnalyze } from './utils/build-conf'

const packageInfo = require('../package.json')

// 禁掉 auto freeze，否则有的插件改数据时会异常，
// 比如 postcss-loader 会去 delete options 上的 plugins 字段；
// 详情见 https://immerjs.github.io/immer/docs/freezing
setAutoFreeze(false)

const options: Record<string, yargs.Options> = {
  BUILD_ROOT: {
    alias: 'r',
    desc: 'Root path of your project (which contains build-config.json)',
    type: 'string',
    default: process.cwd()
  },
  BUILD_ENV: {
    alias: 'e',
    desc: 'Environment for build, one of [ development, production ]',
    type: 'string',
    default: Env.Dev
  },
  PORT: {
    alias: 'p',
    desc: 'Port for dev server',
    type: 'number',
    default: 80
  },
  BUILD_CONFIG_FILE: {
    alias: 'c',
    desc: 'Path of build config file. If provided, it will be used superior to build-config.json under BUILD_ROOT',
    type: 'string'
  },
  verbose: {
    type: 'boolean',
    desc: 'Output more info',
    default: false
  }
}

interface Command {
  desc: string
  handler: (args: yargs.Arguments) => unknown
  isDefault?: boolean
}

const commands: Record<string, Command> = {
  clean: {
    desc: 'Clean result file',
    async handler() {
      // By `require` in `handler` instead of `import` at the top, modules will be lazily loaded.
      // When executing one command, builder does not need to load unnecessary modules, so we get performance improvement.
      // P.S. We always overestimate the speed of module loading in Node.js
      await require('./clean').default()
    }
  },
  generate: {
    desc: 'Generate result file',
    async handler() {
      await require('./generate').default()
    }
  },
  upload: {
    desc: 'Upload result file',
    async handler() {
      await require('./upload').default()
    }
  },
  test: {
    desc: 'Run unit test cases',
    async handler() {
      await require('./test').default()
    }
  },
  build: {
    desc: 'Clean, generate & upload result file',
    async handler() {
      await require('./clean').default()
      await require('./generate').default()
      await require('./upload').default()
    }
  },
  serve: {
    isDefault: true,
    desc: 'Launch the dev server',
    async handler(args) {
      await require('./serve').default(args.PORT as number)
    }
  },
  analyze: {
    desc: 'Visually analyze bundle dependencies',
    async handler() {
      setNeedAnalyze(true)
      await require('./generate').default()
    }
  }
}

function applyArgv(argv: yargs.Arguments) {
  if (argv.verbose) {
    logger.level = 'debug'
  }

  if (argv.BUILD_ROOT) {
    setBuildRoot(argv.BUILD_ROOT as string)
  }

  if (argv.BUILD_CONFIG_FILE) {
    setBuildConfigFilePath(argv.BUILD_CONFIG_FILE as string)
  }

  if (argv.BUILD_ENV) {
    const value = argv.BUILD_ENV as Env
    if (!Object.values(Env).includes(value)) {
      logger.warn('Invalid BUILD_ENV value:', value)
    } else {
      setEnv(argv.BUILD_ENV as Env)
    }
  }
}

function handleError(e: unknown) {
  if (Array.isArray(e)) {
    e.forEach(item => logger.error(item))
  } else {
    e && logger.error(e)
  }
  logger.fatal('Encountered error, exit 1')
  process.exit(1)
}

let parser = yargs(process.argv.slice(2))

Object.entries(options).forEach(([name, option]) => {
  parser = parser.option(name, option)
})

Object.entries(commands).forEach(([name, { desc, handler, isDefault }]) => {
  const command = isDefault ? [name, '*'] : name
  parser = parser.command(command, desc, () => {}, async argv => {
    applyArgv(argv)

    try {
      await require('./prepare').default()
      await handler(argv)
    } catch(e) {
      handleError(e)
    }
  })
})

parser
  .version(packageInfo.version).alias('v', 'version') // enable --version
  .help('h').alias('h', 'help')
  .locale('en')
  .argv
