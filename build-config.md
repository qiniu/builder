# **`Build Config`**

类型：object

build config 字段定义，与被 extends 的 JSON 配置是 shallow extends 的关系

`Build Config` 的字段描述如下：

## **`extends`**

类型：string

作为基础进行扩展的配置信息名，不填写该字段会默认使用 [`default`](https://github.com/Front-End-Engineering-Cloud/builder/blob/master/preset-configs/default.json )，目前可用的内置配置见 https://github.com/Front-End-Engineering-Cloud/builder/tree/master/preset-configs 。

* 若该项值置为 ""，则不会基于任何已有配置进行扩展。

* 也可以提供一个本地文件的路径，使用本地配置文件作为被扩展对象，如：`./build-config.base.json`，相对路径会被相对当前配置文件的路径进行解析。

## **`publicUrl`**

类型：string

静态资源被发布后的线上 URL，一般直接使用存放静态资源的 bucket 对应的公开域名即可，如 "https://o4jiepyc4.qnssl.com/ "。

## **`srcDir`**

类型：string

源码目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 "src"。

## **`staticDir`**

类型：string

构建静态资源目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 "static"。

## **`distDir`**

类型：string

构建目标目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 "dist"。

## **`entries`**

类型：object

入口文件，要求是一个 object，key 为入口文件名（如 `"index"`），value 为入口文件相对于项目根目录的路径（如 "src/index.js"）。

- **`entries.(.*)`**

    类型：string

    入口文件相对于项目根目录的路径（如 "src/index.js"）

## **`pages`**

类型：object

页面，与被 extend 的文件的该字段是「替换」的关系。要求是一个 object，key 为页面名（如 `"index"`），value 为一个 object，包含三个字段：`template`, `entries`, `path`

- **`pages.(.*)`**

    类型：object

    一个 object 表示一个页面，包含三个字段：`template`, `entries`, `path`

    `pages.(.*)` 的字段描述如下：

  - **`pages.(.*).template`**

      类型：string

      页面的模板文件相对于项目根目录的路径，支持 ejs

  - **`pages.(.*).entries`**

      `pages.(.*).entries` 类型为以下几种之一：

    - **`string`**

        类型：string

        

    - **`array`**

        类型：string[]

        

  - **`pages.(.*).path`**

      类型：string

      在应用中该页面的路径正则（如 `""`、`"^\/financial\/"`），dev server 在请求匹配对应 path 时会返回该页面的内容作为响应。

## **`transforms`**

类型：object

构建过程中的转换配置，与被 extend 的文件的该字段是「extends」的关系，要求是一个 object。key 为文件后缀名，value 为转换信息。转换信息支持两种格式：

1. 直接使用 transformer 名，如 "css"、"less"

2. 一个 object，包含两个字段：`transformer` 与 `config`。对于不同的 transformer，我们可以通过与 `transformer` 平级的 `config` 字段对 transformer 的行为进行配置。

- **`transforms.(.*)`**

    `transforms.(.*)` 类型为以下几种之一：

  - **`string`**

      类型：string

      直接使用 transformer 名，如 "css"、"less"

  - **`object`**

      类型：object

      一个 object，包含两个字段：`transformer` 与 `config`。对于不同的 transformer，我们可以通过与 `transformer` 平级的 `config` 字段对 transformer 的行为进行配置。

      `transforms.(.*)` 的字段描述如下：

    - **`transforms.(.*).transformer`**

        类型：string

        即 transformer 名，如 `babel`

    - **`transforms.(.*).config`**

        类型：object

        即 transformer 的配置，如 `{ "presets": ["es2015"] }`

## **`envVariables`**

类型：object

注入到代码中的环境变量，与被 extend 的文件的该字段是「替换」的关系。如配置：



```

"API_PREFIX": "http://foobar.com/api"

```



则代码中：



```js

const apiUrl = API + 'test'

```



会被转换为：



```js

const apiUrl = "http://foobar.com/api" + 'test'

```

## **`targets`**

类型：object

配置构建的目标环境信息，与被 extend 的文件的该字段是「替换」的关系。目前支持字段：`browsers`。

`targets` 的字段描述如下：

- **`targets.browsers`**

    类型：string[]

    设置构建的目标浏览器版本，同时设定 babel-env 和 autoprefix，类型为 `string[]`，详见：[browserslist](https://github.com/browserslist/browserslist#full-list)

## **`optimization`**

类型：object

优化项，与被 extend 的文件的该字段是「extends」的关系

`optimization` 的字段描述如下：

- **`optimization.addPolyfill`**

    类型：boolean

    是否开启自动 polyfill 功能，开启后会根据 `targets.browsers` 参数自动打包对应的 polyfill，并在作为独立的包被页面前置引用，`true` 启用，`false` 禁用

- **`optimization.extractCommon`**

    类型：boolean

    控制是否抽取 entries 间的公共内容到单独的文件中，在有多个 entry 时可以减少结果文件的总体积，`true` 启用，`false` 禁用

- **`optimization.extractVendor`**

    类型：string

    控制抽取固定依赖（vendor）的行为，要求传入一个入口文件名（`entry`）以启用；

    该 entry 的内容将会被认为是固定依赖，被抽取到单独的文件中，而不会重复出现在每个 entry 的结果文件里。

    一方面它可以更精确地实现抽取公共内容的效果，另外一方面，在 vendor entry 内容不变的情况下，结果文件本身的 hash 不会改变，可以更充分地利用浏览器缓存。典型的 vendor entry 的内容形如：

    

    ```javascript

    import 'react'

    import 'moment'

    import 'lodash'

    ```

- **`optimization.compressImage`**

    类型：boolean

    是否压缩图片(png, jpe?g, gif)，`true` 启用，`false` 禁用

- **`optimization.transformDeps`**

    `optimization.transformDeps` 类型为以下几种之一：

  - **`boolean`**

      类型：boolean

      

  - **`array`**

      类型：string[]

      

## **`devProxy`**

类型：object

需要 dev sever 进行代理的请求配置，与被 extend 的文件的该字段是「替换」的关系。要求是一个 object，key 为 api 路径前缀，value 为代理目标，如 `{ "/api": "http://foobar.com" }` 表示把形如 `/api/*` 的请求代理到 `http://foobar.com/api/*`

- **`devProxy.(.*)`**

    类型：string

    

## **`deploy`**

类型：object

部署配置，与被 extend 的文件的该字段是「extends」的关系，要求是一个 object，包含两个字段：`target` 及 `config`

`deploy` 的字段描述如下：

- **`deploy.target`**

    类型：string

    部署目标

- **`deploy.config`**

    类型：object

    针对当前部署目标的配置信息，如 target 为 `"qiniu"` 时，需要提供的 config 形如：

    

    ```json

    {

      "AccessKey": "xxx",

      "SecretKey": "yyy",

      "bucket": "zzz"

    }

    ```

    

    表示使用 `xxx`、`yyy` 分别作为 AccessKey 与 SecretKey，上传到名为 `zzz` 的 bucket。

## **`test`**

类型：object

测试相关配置，与被 extend 的文件的该字段是「extends」的关系

## **`engines`**

类型：object

配置对构建环境的要求，与被 extend 的文件的该字段是「替换」的关系。目前支持字段：`builder`

`engines` 的字段描述如下：

- **`engines.builder`**

    类型：string

    配置项目所要求的 fec-builder 版本范围，格式遵循 [node-semver range](https://github.com/npm/node-semver#ranges)

    在统一的构建环境中，服务应依据该版本范围去选择合适的 builder 版本对项目进行构建；本地开发时，若本地使用的 builder 版本不匹配项目所配置的版本范围，会输出警告信息，但不影响使用