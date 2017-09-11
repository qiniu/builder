#!/bin/bash

# 安装输入（被构建）项目的依赖
cd ${BUILD_ROOT:="/fec/input"}

if [[ -f build-prepare.sh ]]; then
  sh build-prepare.sh
  echo "[PREPARE] done."
fi

cd /fec

# 开发环境执行 serve
if [[ "${BUILD_ENV}" == "development" ]]; then
  npm run serve
fi

# 生产环境执行 build
if [[ "${BUILD_ENV}" == "production" ]]; then
  npm run build
fi
