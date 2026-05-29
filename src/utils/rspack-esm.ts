/**
 * Rspack v2+ packages are pure ESM. TypeScript (module: commonjs) compiles
 * `import()` to `require()`, so use a runtime dynamic import here.
 */

type RspackCoreModule = typeof import('@rspack/core')
type RspackDevServerModule = typeof import('@rspack/dev-server')
type ReactRefreshModule = typeof import('@rspack/plugin-react-refresh')

const importEsm = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<unknown>

let rspackCoreModule: RspackCoreModule | undefined
let rspackDevServerModule: RspackDevServerModule | undefined
let reactRefreshModule: ReactRefreshModule | undefined

export async function loadRspackCore(): Promise<RspackCoreModule> {
  rspackCoreModule ??= await importEsm('@rspack/core') as RspackCoreModule
  return rspackCoreModule
}

export async function loadRspackDevServer(): Promise<RspackDevServerModule> {
  rspackDevServerModule ??= await importEsm('@rspack/dev-server') as RspackDevServerModule
  return rspackDevServerModule
}

export async function loadReactRefreshPlugin(): Promise<ReactRefreshModule['ReactRefreshRspackPlugin']> {
  reactRefreshModule ??= await importEsm('@rspack/plugin-react-refresh') as ReactRefreshModule
  return reactRefreshModule.ReactRefreshRspackPlugin
}
