/**
 * @file env info
 * @author nighca <nighca@live.cn>
 */

export enum Env {
  Test = 'test',
  Dev = 'development',
  Prod = 'production'
}

let env: Env = process.env.BUILD_ENV as Env

/** Get build env */
export function getEnv() {
  return env
}

export function setEnv(target: Env) {
  env = process.env.NODE_ENV = target
}
