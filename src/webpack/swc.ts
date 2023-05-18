import fs from 'fs'
import path from 'path'
import browserslist from 'browserslist'
import { Options as SwcOptions } from '@swc/core'
import { CompilerOptions } from 'typescript'
import { mergeWith } from 'lodash'
import { parse } from 'jsonc-parser'

import { shouldAddGlobalPolyfill, AddPolyfill } from '../utils/build-conf'
import { getBuildRoot } from '../utils/paths'

/** 读取 tsconfig.json 文件获取 compilerOptions 配置 */
function getTsCompilerOptions(): CompilerOptions | null {
  const { compilerOptions } = loadTsConfig('tsconfig.json') ?? {}
  return compilerOptions ?? null
}

function loadTsConfig(filename: string, tsConfig?: any): any {
  let data = resolveTsConfig(filename) ?? {}

  if (!data) return tsConfig

  if (tsConfig) {
    data = mergeWith(data, tsConfig, (_, targetValue) => {
      if (Array.isArray(targetValue)) {
        return targetValue
      }
    })
  }

  let extendsName = data.extends
  if (!extendsName) return data

  delete data.extends
  if (!extendsName.endsWith('.json')) {
    extendsName += '.json'
  }

  return loadTsConfig(extendsName, data)
}

function resolveTsConfig(filename: string) {
  const filePath = path.resolve(getBuildRoot(), filename)

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, { encoding: 'utf8' })
    return parse(content)
  }

  return null
}

/** swc 不会读取 tsconfig.json 的配置，这里手动转成 swc 的配置 */
/** 参考自 https://github.com/Songkeys/tsconfig-to-swcconfig/blob/62e7f585882443bd27beb5b2e05a680f18070198/src/index.ts */
function transformTsCompilerOptions(options: CompilerOptions | null): SwcOptions {
  const {
    importHelpers = false,
    experimentalDecorators = false,
    emitDecoratorMetadata = false,
    jsxFactory = 'React.createElement',
    jsxFragmentFactory = 'React.Fragment',
    jsxImportSource = 'react',
    paths,
    baseUrl
  } = options ?? {}

  return {
    jsc: {
      externalHelpers: importHelpers,
      parser: {
        syntax: 'typescript',
        decorators: experimentalDecorators
      },
      transform: {
        decoratorMetadata: emitDecoratorMetadata,
        react: {
          pragma: jsxFactory,
          pragmaFrag: jsxFragmentFactory,
          importSource: jsxImportSource,
        },
      },
      paths,
      baseUrl
    }
  }
}

export function makeSwcLoaderOptions(
  /** https://swc.rs/docs/configuration/supported-browsers#targets */
  targets: string[],
  /** polyfill 模式 */
  polyfill: AddPolyfill,
  /** 是否 react 项目 */
  withReact = false,
  /** 是否 ts 语法 */
  isTsSyntax = false
): SwcOptions {
  const swcOptions: SwcOptions = {
    jsc: {
      parser: {
        syntax: isTsSyntax ? 'typescript' : 'ecmascript',
        jsx: withReact,
        dynamicImport: true,
        decorators: true
      },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
        useDefineForClassFields: true
      },
      externalHelpers: true
    },
    env: {
      targets: browserslist(targets),
      ...(
        // global polyfill
        shouldAddGlobalPolyfill(polyfill)
        && {
          // https://swc.rs/docs/configuration/supported-browsers#mode
          mode: 'usage',
          coreJs: '3',
          shippedProposals: true
        }
      )
    }
  }

  if (isTsSyntax) {
    const compilerOptions = getTsCompilerOptions()

    if (compilerOptions != null) {
      return mergeWith(swcOptions, transformTsCompilerOptions(compilerOptions), (_, targetValue) => {
        if (Array.isArray(targetValue)) {
          return targetValue
        }
      })
    }
  }

  return swcOptions
}
