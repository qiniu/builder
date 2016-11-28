#!/bin/bash

cd /fec/input

npm install

cd ..

if [[ "${BUILD_ENV}" == "development" ]]; then
  NODE_ENV=$BUILD_ENV npm run serve
fi

if [[ "${BUILD_ENV}" == "production" ]]; then
  NODE_ENV=$BUILD_ENV npm run build
fi

# find ./input/dist

# anywhere -p 80 -d ./dist -s