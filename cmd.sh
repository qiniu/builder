#!/bin/bash

# 安装输入（被构建）项目的依赖
cd ${BUILD_ROOT:="/fec/input"}

if [[ -f build-prepare.sh ]]; then
  sh build-prepare.sh
fi

cd /fec

# 开发环境执行 serve
if [[ "${BUILD_ENV}" == "development" ]]; then
  NODE_ENV=$BUILD_ENV BUILD_ROOT=$BUILD_ROOT npm run serve
fi

# 生产环境执行 build
if [[ "${BUILD_ENV}" == "production" ]]; then
  NODE_ENV=$BUILD_ENV BUILD_ROOT=$BUILD_ROOT npm run build
fi
