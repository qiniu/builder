import browserslist from 'browserslist'
import { shouldAddGlobalPolyfill, AddPolyfill } from '../utils/build-conf'

export function makeSwcLoaderOptions(
  /** https://swc.rs/docs/configuration/supported-browsers#targets */
  targets: string[],
  /** polyfill 模式 */
  polyfill: AddPolyfill,
  /** 是否 react 项目 */
  withReact = false,
  /** 是否 ts 语法 */
  isTsSyntax = false
) {
  return {
    jsc: {
      parser: {
        syntax: isTsSyntax ? 'typescript' : 'ecmascript',
        jsx: withReact,
        dynamicImport: true,
        decorators: true
      },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true
      }
    },
    env: {
      targets: browserslist(targets),
      ...(
        // global polyfill
        shouldAddGlobalPolyfill(polyfill)
        && {
          // https://swc.rs/docs/configuration/supported-browsers#mode
          mode: 'usage',
          coreJs: '3'
        }
      )
    }
  }
}
