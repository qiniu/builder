#!/bin/bash

# 安装输入（被构建）项目的依赖
cd /fec/input
yarn install --pure-lockfile

cd /fec

# 开发环境执行 serve
if [[ "${BUILD_ENV}" == "development" ]]; then
  NODE_ENV=$BUILD_ENV npm run serve
fi

# 生产环境执行 build
if [[ "${BUILD_ENV}" == "production" ]]; then
  NODE_ENV=$BUILD_ENV npm run build
fi
