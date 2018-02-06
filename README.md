# fec-builder

通用的前端构建工具，屏蔽业务无关的细节配置，开箱即用

### 为什么

背景：业界前端工程化方案的趋同

* 模块化方案的统一
* 样式 & 图片等非 Javascript 资源的引入手段有最佳实践
* 性能优化的最佳实践趋同

上述背景下，前端开发者不应该再需要去关心具体的工程化方案的细节与搭建，工程层面的性能优化措施等。fec-builder 的目标是，通过尽可能少的配置，引入包含业界最佳实践的工程化方案，让开发者得以专注于业务的实现。

长期来看，前端项目不再需要向项目中引入 dev dependencies，也不再需要自己搭建构建、部署 & 持续集成的环境，通过向项目添加一个 `build-config.json` 文件，即可使用通用的服务完成这些过程。

### 使用

npm 包（适合本地开发用）

```shell
# fec-builder 使用 npm-shrinkwrap.json 锁定依赖版本，yarn 不会识别 npm-shrinkwrap.json
# 这里请使用 npm 安装全局包
npm i fec-builder -g
# 项目目录下执行
fec-builder -p 8080
```

docker 镜像（适合持续集成环境使用）

```shell
docker pull hub.c.163.com/nighca/fec-builder:latest
# 项目目录下执行
docker run -v ${PWD}:/fec/input -e "BUILD_ENV=production" --rm fec-builder
```

npm 包与 docker 镜像的对比，优点：

* 不需要安装 docker，通过淘宝镜像源的话装起来应该也比 docker pull image 快
* 构建行为直接在宿主机运行，性能会比在容器中稍好，首次构建大约会快 20%

缺点：

* 没有那么可靠，安装时可能会出错（往往错在 node 构建二进制包的部分），构建行为也不能保证完全一致

### build-config.json 的配置

* extends

	作为基础进行扩展的配置信息名，不填写该字段会默认使用 [`default`](https://github.com/Front-End-Engineering-Cloud/builder/blob/master/preset-configs/default.json)，目前可用的内置配置[见此](https://github.com/Front-End-Engineering-Cloud/builder/tree/master/preset-configs)。若该项值置为 `""`，则不会基于任何已有配置进行扩展。

	也可以提供一个本地文件的路径，使用本地配置文件作为被扩展对象，如：`./build-config.base.json`，相对路径会被相对当前配置文件的路径进行解析。

* publicUrl

	静态资源被发布后的线上 URL，一般直接使用存放静态资源的 bucket 对应的公开域名即可，如 `"https://o4jiepyc4.qnssl.com/"`。

* srcDir

	源码目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 `"src"`。

* distDir

	构建目标目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 `"dist"`。

* entries

	入口文件，要求是一个 object，key 为入口文件名（如 `"index"`），value 为入口文件相对于项目根目录的路径（如 `"src/index.js"`）。

* pages

	页面，要求是一个 object，key 为页面名（如 `"index"`），value 为一个 object，包含三个字段：`template`, `entries`, `path`

	- template

		页面的模板文件相对于项目根目录的路径，支持 ejs

	- entries

		页面上的入口文件列表，在只有一个入口文件的情况下，可以直接传入一个字符串，即该入口文件名（如 `"index"`）；也可以传入一个数组，数组每一项为一个入口文件名，（如 `["sidebar", "index"]`）

	- path

		在应用中该页面的路径正则（如 `""`、`"^\\/financial\\/"`），dev server 在请求匹配对应 path 时会返回该页面的内容作为响应。

* transforms

	构建过程中的转换配置，要求是一个 object。key 为文件后缀名，value 为转换信息。转换信息支持两种格式：

	1. 直接使用 transformer 名，如 `"css"`、`"less"`

	2. 一个 object，包含两个字段：`transformer` 与 `config`，具体各 transformer 对应的可配置项见下方 transformer 的配置

		- `transformer`: 即 transformer 名，如 `babel`
		- `config`: 即 transformer 的配置，如
			```json
			{
				"presets": ["es2015"]
			}
			```

* envVariables

	注入到代码中的环境变量，如配置：

	```json
	{
		"envVariables": {
			"API_PREFIX": "http://foobar.com/api"
		}
	}
	```

	则代码中：

	```js
	const apiUrl = API_PREFIX + 'test'
	```

	会被转换为：

	```js
	const apiUrl = "http://foobar.com/api" + 'test'
	```

* targets

  设置代码的目标版本，同时设定 babel-env 和 autoprefix，autoprefix 只取其中的 browsers 部分

* devProxy

	需要 dev sever 进行代理的请求配置，要求是一个 object，key 为 api 路径前缀，value 为代理目标，如

	```json
	{
		"/api": "http://foobar.com"
	}
	```

	表示把形如 `/api/*` 的请求代理到 `http://foobar.com/api/*`

* deploy

	部署配置，要求是一个 object，包含两个字段：`target` 及 `config`

	- target 部署目标，目前仅支持 `"qiniu"`
	- config 针对当前部署目标的配置信息，如 target 为 `"qiniu"` 时，需要提供的 config 形如：

		```json
		{
			"AccessKey": "xxx",
			"SecretKey": "yyy",
			"bucket": "zzz"
		}
		```

		表示使用 `xxx`、`yyy` 分别作为 AccessKey 与 SecretKey，上传到名为 `zzz` 的 bucket。

* engines

	配置对构建环境的要求。目前支持字段：`builder`

	- builder 配置项目所要求的 fec-builder 版本范围，格式遵循 [node-semver range](https://github.com/npm/node-semver#ranges)

		在统一的构建环境中，服务应依据该版本范围去选择合适的 builder 版本对项目进行构建；本地开发时，若本地使用的 builder 版本不匹配项目所配置的版本范围，会输出警告信息，但不影响使用

	示例：

	```json
	{
		"engines": {
			"builder": "^1.5.0"
		}
	}
	```

* optimization

	优化项

	- extractCommon

		是否抽取 entries 间的公共内容到单独的文件中

	- extractVendor

		公用固定依赖集合，使用字段信息如 page.entries ，但是不支持数组
		如：vendor.js
			```javascript
			import 'react'
			import 'moment'
			import 'lodash'
			// ...
			```

### transformer 的配置

对于不同的 transformer，我们可以通过与 `transformer` 平级的 `config` 字段对 transformer 的行为进行配置，这里是不同 transformer 支持的配置项：

##### `ts`

* `transpileOnlyWhenDev: boolean = true`

	对于 ts 的转换，builder 会默认在开发模式跳过类型检查，提高构建效率，避免过严的限制；这个行为可以通过配置 `transpileOnlyWhenDev` 为 `false` 禁用，即，在开发时也进行类型检查

##### `tsx`

* `transpileOnlyWhenDev: boolean = true`

	同 `ts` 的 `transpileOnlyWhenDev` 配置


### CHANGELOG

v1.4.0 及以后后的 Changelog 见 [Releases 页面](https://github.com/Front-End-Engineering-Cloud/builder/releases)

v1.4.0 前的 Changelog：

##### 1.3.7

支持省略项目目录下的 postcss.config.js 文件

##### 1.3.6

开发模式下避免类型检查（ts-loader 配置 [`transpileOnly`](https://github.com/TypeStrong/ts-loader/#transpileonly-boolean-defaultfalse)）

##### 1.3.5

修复 dev server 在 `publicUrl` 的 path 不为 `/` 时不能正确实现 history fallback 的 bug

##### 1.3.4

升级 vue 构建依赖，修复 vue 构建的 bug

##### 1.3.3

更新默认的 babel 配置

原先为 `"presets": ["es2015"]`

更新为 `"presets": ["es2015", "es2016", "es2017", "stage-2"], "plugins": ["babel-plugin-transform-decorators-legacy"]`

##### 1.3.2

更新 README

##### 1.3.1

完善 vue 支持，对 vue 文件内部资源（如 js）采用与外部（如 js）一致的转换（transform）策略

##### 1.3.0

升级 typescript(2.3.4)

##### 1.2.0

升级 webpack(2.6.1)、webpack-dev-server(2.4.5)、extract-text-webpack-plugin(2.1.2)

对于 css 内容，使用 contenthash 而不是 chunkhash（生成的 css 文件有独立的 hash）

##### 1.1.2

debug babel 配置

##### 1.1.1

支持对 vue-loader 进行配置

##### 1.1.0

支持 vue

##### 1.0.0

可用

### 常见问题

##### CPU 占用率异常

如发现 builder 的 npm 包执行出现 cpu 占用极高的情况（不编译时都 90%+），很可能是依赖 fsevents 没有正确安装，可以去 fec-builder 包的安装目录（一般是 `/usr/local/lib/node_modules/fec-builder`）下执行：

```shell
npm i fsevents@1.0.17
```

待安装成功后重新运行 fec-builder 即可

##### 使用 Typescript 时没有 [Tree Shaking](https://webpack.js.org/guides/tree-shaking/) 的效果

Tree Shaking 功能的生效需要由 Webpack 来处理 ES6 的 module 格式，所以在 Webpack 之前（loader 中）对 ES6 module 进行转换（如转换为 CommonJS 格式）的话，会导致构建没有 Tree Shaking 的效果。如果你在使用 Typescript，很可能是配置 Typescript 输出了 CommonJS 的结果。

修正做法：配置项目根目录下的 `tsconfig.json`，配置其中 `compilerOptions` 中的 `module` 值为 `ES6` 即可；或者不对 `compilerOptions.module` 进行配置，直接配置 `compilerOptions.target` 为 `ES6` 或更高（`ES2016`, `ES2017` 或 `ESNext`）亦可。
