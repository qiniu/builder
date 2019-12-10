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

见 [build-config.md](./build-config.md)

VSCode 中可以通过安装插件 [fec-builder-helper](https://marketplace.visualstudio.com/items?itemName=codingyjt.fec-builder-helper&ssr=false#overview) 完成配置获取辅助提示。

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

##### Error: EACCES, mkdir '/usr/local/lib/node_modules/fec-builder/node_modules/node-sass'

参考 https://github.com/sass/node-sass/issues/1098
