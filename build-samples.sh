#!/bin/bash

set -o errexit

echo 'Building sample/hello-world!'
cd samples/hello-world
../../bin/fec-builder clean && ../../bin/fec-builder generate -e production
echo "$(cat dist/index.html)"

echo 'Building sample/react!'
cd ../react
npm i
../../bin/fec-builder clean && ../../bin/fec-builder generate -e production
echo "$(cat dist/index.html)"

echo 'Building sample/react-mobx-ssr!'
cd ../react-mobx-ssr
npm i
../../bin/fec-builder clean && ../../bin/fec-builder generate -e production --ISOMORPHIC_TOOLS_FILE ./server/isomorphic.js
echo "$(cat dist/index.html)"

echo 'Building sample/typescript-react!'
cd ../typescript-react
npm i 
../../bin/fec-builder clean && ../../bin/fec-builder generate -e production
echo "$(cat dist/index.html)"
