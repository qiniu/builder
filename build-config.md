# **`Build Config`**

类型：`object`

Build config 各个字段的定义。

`Build Config` 的字段描述如下：

## **`extends`**

类型：`string`

作为基础进行扩展的配置信息名，不填写该字段会默认使用 [`default`](https://github.com/Front-End-Engineering-Cloud/builder/blob/master/preset-configs/default.json)，目前可用的内置配置见 [preset-configs](https://github.com/Front-End-Engineering-Cloud/builder/tree/master/preset-configs)。

* 若该项值置为 ""，则不会基于任何已有配置进行扩展。

* 除了内置的配置外，`extends` 的对象也可以是是一个本地文件，如：`./build-config.base.json`，相对路径会被相对当前配置文件的路径进行解析。

* `extends` 的对象也可以是一个 npm package，如 `"extends": "@qiniu/build-config"`，那么会尝试从项目的依赖中找到 `@qiniu/build-config` 包，解析并使用其中的 `build-config.json` 文件。

    为了避免名字的冲突，所有可以被 `extends` 的 npm package 都要求名称成 `build-config-xxx`，或者 `@xxx/build-config`，或者 `@xxx/build-config-yyy`；

    你也可以进一步指定 npm package 中的子目录，如，对于 `"extends": "@qiniu/build-config/portal"`，builder 会尝试使用 `@qiniu/build-config` 包中 `portal/` 目录下的 `build-config.json` 文件。

* 扩展时，假设 `A.json` extends `B.json`，

    * `A.json` 中，`{ ..., "foo": { "bar": "a" }, ... }`

    * `B.json` 中，`{ ..., "foo": { "baz": "b" }, ... }`

    则对配置中的每个字段存在两类行为：

    1. **覆盖**：**默认行为**，即 `A.json` 中的 `foo` 的值覆盖了 `B.json` 中对应的值，最终配置的 `foo` 的值等于 `{ "bar": "a" }`；

    2. **合并**：即 `A.json` 中的 `foo` 的值与 `B.json` 中对应的值进行了合并操作，最终配置的 `foo` 的值等于 `{ "bar": "a", "baz": "b" }`；

## **`publicUrl`**

类型：`string`

静态资源被发布后的线上 URL，一般直接使用存放静态资源的 bucket 对应的公开域名即可，如 "https://o4jiepyc4.qnssl.com/ "。

## **`srcDir`**

类型：`string`

源码目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 "src"。

## **`staticDir`**

类型：`string`

构建静态资源目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 "static"。

## **`distDir`**

类型：`string`

构建目标目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 "dist"。

## **`entries`**

类型：`object`

入口文件，在扩展时会覆盖原值，要求是一个 object，key 为入口文件名（如 `"index"`），value 为入口文件相对于项目根目录的路径（如 "src/index.js"）。

`entries` 的字段描述如下：

- **`entries.(.*)`**

    类型：`string`

    入口文件相对于项目根目录的路径（如 "src/index.js"）

## **`pages`**

类型：`object`

页面，在扩展时会覆盖原值。要求是一个 object，key 为页面名（如 `"index"`），value 为一个 object，包含三个字段：`template`, `entries`, `path`。

`pages` 的字段描述如下：

- **`pages.(.*)`**

    类型：`object`

    一个 object 表示一个页面，包含三个字段：`template`, `entries`, `path`。

    `pages.(.*)` 的字段描述如下：

    - **`pages.(.*).template`**

        类型：`string`

        页面的模板文件相对于项目根目录的路径，支持 ejs。

    - **`pages.(.*).entries`**

        页面上的入口文件列表

        * 在只有一个入口文件的情况下，可以直接传入一个字符串，即该入口文件名（如 "index"）；

        * 也可以传入一个数组，数组每一项为一个入口文件名（如 `["sidebar", "index"]`）。

        `pages.(.*).entries` 类型为以下几种之一：

        - **`string`**

            类型：`string`

        - **`array`**

            类型：`string[]`

    - **`pages.(.*).path`**

        类型：`string`

        在应用中该页面的路径正则（如 `""`、`"^\/financial\/"`），dev server 在请求匹配对应 path 时会返回该页面的内容作为响应。

## **`resolve`**

类型：`object`

对于模块解析行为的配置，在扩展时会合并原值。

`resolve` 的字段描述如下：

- **`resolve.alias`**

    类型：`object`

    配置别名以控制对特定模块或路径的解析行为；如配置 `{ "foo": "src/foo" }`，则模块 `foo` 会被解析到 `<项目根目录>/src/foo`，模块 `foo/bar` 会被解析到 `<项目根目录>/src/foo/bar`

    `resolve.alias` 的字段描述如下：

    - **`resolve.alias.(.*)`**

        类型：`string`

        解析目标的路径（相对于项目根目录），如 `"src/foo"`。

## **`transforms`**

类型：`object`

构建过程中的转换配置，在扩展时会合并原值，要求是一个 object。key 为文件后缀名，value 为转换信息。转换信息支持两种格式：

1. 直接使用 transformer 名，如 "css"、"less"

2. 一个 object，包含两个字段：`transformer` 与 `config`。对于不同的 transformer，我们可以通过与 `transformer` 平级的 `config` 字段对 transformer 的行为进行配置。

`transforms` 的字段描述如下：

- **`transforms.(.*)`**

    `transforms.(.*)` 类型为以下几种之一：

    - **`string`**

        类型：`string`

        直接使用 transformer 名，如 "css"、"less"

    - **`object`**

        类型：`object`

        一个 object，包含两个字段：`transformer` 与 `config`。对于不同的 transformer，我们可以通过与 `transformer` 平级的 `config` 字段对 transformer 的行为进行配置。

        `object` 的字段描述如下：

        - **`transforms.(.*).transformer`**

            类型：`string`

            即 transformer 名，如 `babel`

        - **`transforms.(.*).config`**

            类型：`object`

            即 transformer 的配置，如 `{ "presets": ["es2015"] }`

## **`envVariables`**

类型：`object`

注入到代码中的环境变量，在扩展时会合并原值。如配置：

```
"API_PREFIX": "http://foobar.com/api"
```

则代码中：

```js
const apiUrl = API_PREFIX + 'test'
```

会被转换为：

```js
const apiUrl = "http://foobar.com/api" + 'test'
```

## **`targets`**

类型：`object`

配置构建的目标环境信息，在扩展时会覆盖原值。目前支持字段：`browsers`。

`targets` 的字段描述如下：

- **`targets.browsers`**

    类型：`string[]`

    设置构建的目标浏览器版本，同时设定 babel-env 和 autoprefix，类型为 `string[]`，详见：[browserslist](https://github.com/browserslist/browserslist#full-list)

## **`optimization`**

类型：`object`

优化项，在扩展时会合并原值

`optimization` 的字段描述如下：

- **`optimization.addPolyfill`**

    是否开启自动 polyfill 功能，以及开启何种形式的 polyfill；开启后会根据 `targets.browsers` 参数自动实现对应的 polyfill；

    * `false`: 不开启 `polyfill`

    * `true`: 开启 `polyfill`，使用默认的方式 (`"global"`) 进行 `polyfill`

    * `"global"`: 开启基于 `@babel/preset-env` 的 `polyfill`，polyfill 会被作为独立的包被页面前置引用，会污染全局内置对象，适合普通应用

    * `"runtime"`: 开启基于 `@babel/plugin-transform-runtime` 的 `polyfill`，生成辅助函数以替换特定方法，不会污染全局命名空间，适用于工具类库

    `optimization.addPolyfill` 类型为以下几种之一：

    - **`string`**

        类型：`string`

    - **`boolean`**

        类型：`boolean`

- **`optimization.extractCommon`**

    类型：`boolean`

    控制是否抽取 entries 间的公共内容到单独的文件中，在有多个 entry 时可以减少结果文件的总体积，`true` 启用，`false` 禁用

- **`optimization.extractVendor`**

    控制是否抽取固定依赖（vendor）到单独的文件中，而不会重复出现在每个 entry 的结果文件里。

    使用方式为指定固定依赖的数组或者传 `boolean`，传指定的依赖时会所依赖的包都将打包进 vendor，指定 `true` 时则抽取所有 node_modules 下的依赖包。

    一方面它可以更精确地实现抽取公共内容的效果，另外一方面，在 vendor 内容不变的情况下，结果文件本身的 hash 不会改变，可以更充分地利用浏览器缓存。典型的 vendor 的内容如：`["react", "moment", "lodash"]`

    `optimization.extractVendor` 类型为以下几种之一：

    - **`boolean`**

        类型：`boolean`

    - **`array`**

        类型：`string[]`

- **`optimization.compressImage`**

    类型：`boolean`

    是否压缩图片(png, jpe?g, gif)，`true` 启用，`false` 禁用

- **`optimization.transformDeps`**

    是否对第三方依赖包（node_modules 中的内容）的 Javascript 内容进行转换（builder 默认会跳过对依赖包 Javascript 内容的转换，以提升构建效率）。

    这里传入 `true` 表示全部进行转换，`false` 则全部不转换；

    也可以传入包名列表来指定需要转换的第三方依赖包，如传入 `[ "react", "mobx" ]`，表示仅对包 react 与包 mobx 的 Javascript 内容进行转换

    `optimization.transformDeps` 类型为以下几种之一：

    - **`boolean`**

        类型：`boolean`

    - **`array`**

        类型：`string[]`

- **`optimization.highQualitySourceMap`**

    类型：`boolean`

    是否提供高质量的 source map。

    builder 默认提供粗粒度的 source map 以提升构建效率，效果上只是简单地将打包后代码按模块分开；开启 `highQualitySourceMap` 后，builder 会提供到源代码的映射，第三方依赖包自带的 source map 信息（如果有）也会被消费，以便为第三方库提供基于源代码的调试体验。

- **`optimization.filesystemCache`**

    类型：`boolean`

    是否启用文件系统缓存，用于提升二次启动的打包速度，对于大型的前端仓库提升效果尤其明显。

    这里传入 `true` 表示启用文件系统缓存，`false` 则不启用。

- **`optimization.errorOverlay`**

    类型：`boolean`

    是否开启 `react-refresh-webpack-plugin` 的错误提示。 

    `true` 表示开启，`false` 表示关闭，默认开启。

- **`optimization.swc`**

    类型：`boolean`

    是否使用 `swc` 替换 `babel-loader`、`ts-loader`，开启 `swc` 时需注意以下几点：

    * 如果自定义 `transforms` 的配置中包含 `babelOptions`，`swc` 将不会开启

    * `swc` 不会读取项目中的 `tsconfig.json` 配置，`fec-builder` 会将 `tsconfig.json` [部分的 `compilerOptions` 配置](https://github.com/Front-End-Engineering-Cloud/builder/pull/167/commits/1679c2ba46c7c2e5babdd9fb29c1202dce8a6da9#diff-83d272b0300573209dc5e33e57e9ac300c837e0327f36ea67cef9a685a06becbR25) 转换后传给 `swc`

    * `swc` 不支持 `ts` 的类型检查，导致 `transpileOnlyWhenDev` 开关无效，如果需要在打包中校验类型可在打包构建步骤中加入 `tsc --noEmit` 来做类型检查

    * `swc` 不支持使用项目中 `typescript` 进行编译，导致 `useProjectTypeScript` 开关无效

    * `swc` 不支持 `JSX` 中的 `spread operator` 语法

    * `browserslist` 在 `swc` 中的行为相较 `babel` 有所差异，以配置的 `extends @qiniu/build-config/portal` 为例，使用 `swc` 后 `bundle` 中会包含 `let` `const` `async` `await` `箭头函数` 语法

    `true` 表示开启，`false` 表示关闭，默认关闭。

## **`devProxy`**

类型：`object`

需要 dev sever 进行代理的请求配置，在扩展时会覆盖原值。要求是一个 object，key 为 api 路径前缀，value 为代理目标，如 `{ "/api": "http://foobar.com" }` 表示把形如 `/api/*` 的请求代理到 `http://foobar.com/api/*`

`devProxy` 的字段描述如下：

- **`devProxy.(.*)`**

    类型：`string`

## **`deploy`**

类型：`object`

部署配置，在扩展时会覆盖原值，要求是一个 object，包含两个字段：`target` 及 `config`

`deploy` 的字段描述如下：

- **`deploy.target`**

    类型：`string`

    部署目标

- **`deploy.config`**

    类型：`object`

    针对当前部署目标的配置信息，如 target 为 `"qiniu"` 时，需要提供的 config 形如：

    ```json
    {
      "accessKey": "xxx",
      "secretKey": "yyy",
      "bucket": "zzz"
    }
    ```    

    表示使用 `xxx`、`yyy` 分别作为 accessKey 与 secretKey，上传到名为 `zzz` 的 bucket。

    也可以通过环境变量的形式来配置，例如：

    ```json
    {
      "accessKey": "{{process.env.BUILD_DEPLOY_ACCESS_KEY}}",
      "secretKey": "{{process.env.BUILD_DEPLOY_SECRET_KEY}}",
      "bucket": "zzz"
    }
    ```    

    表示使用环境变量 `BUILD_DEPLOY_ACCESS_KEY`、`BUILD_DEPLOY_SECRET_KEY` 的值分别作为 accessKey 与 secretKey，上传到名为 `zzz` 的 bucket。

## **`test`**

类型：`object`

测试相关配置，在扩展时会合并原值

## **`engines`**

类型：`object`

配置对构建环境的要求，在扩展时会合并原值。目前支持字段：`builder`

`engines` 的字段描述如下：

- **`engines.builder`**

    类型：`string`

    配置项目所要求的 fec-builder 版本范围，格式遵循 [node-semver range](https://github.com/npm/node-semver#ranges)

    在统一的构建环境中，服务应依据该版本范围去选择合适的 builder 版本对项目进行构建；本地开发时，若本地使用的 builder 版本不匹配项目所配置的版本范围，会输出警告信息，但不影响使用