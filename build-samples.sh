#!/bin/bash

set -o errexit

echo 'Building sample/hello-world!'
cd samples/hello-world
../../bin/fec-builder build

echo 'Building sample/react!'
cd ../react
npm i
../../bin/fec-builder build

echo 'Building sample/react-mobx-ssr!'
cd ../react-mobx-ssr
npm i
../../bin/fec-builder clean && ../../bin/fec-builder generate --ISOMORPHIC_TOOLS_FILE ./server/isomorphic.js

echo 'Building sample/typescript-react!'
cd ../typescript-react
npm i 
../../bin/fec-builder build
