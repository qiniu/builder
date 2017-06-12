# builder

### build-config 字段

* extends

	作为基础进行扩展的配置信息名，不填写该字段会默认使用 [`default`](https://github.com/Front-End-Engineering-Cloud/builder/blob/master/preset-configs/default.json)，目前可用的内置配置[见此](https://github.com/Front-End-Engineering-Cloud/builder/tree/master/preset-configs)。若该项值置为 `""`，则不会基于任何已有配置进行扩展。

* publicUrl

	静态资源被发布后的线上 URL，一般直接使用存放静态资源的 bucket 对应的公开域名即可，如 `"https://o4jiepyc4.qnssl.com/"`。

* srcDir

	源码目录，相对于项目根目录（即存放 `build-prepare.sh` 与 `build-config.json` 的目录）的路径，如 `"src"`。

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

	2. 一个 object，包含两个字段：`transformer` 与 `config`

		- transformer，即 transformer 名，如 `babel`
		- transformer 的配置，如
			```json
			{
				"presets": ["es2015"]
			}
			```

* devProxy

	需要 dev sever 进行代理的请求配置，要求是一个 object，key 为 api 路径前缀，value 为代理目标，如

	```json
	{
		"/api": "http://portalv4.dev.qiniu.io"
	}
	```

	表示把形如 `/api/*` 的请求代理到 `http://portalv4.dev.qiniu.io/api/*`

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
