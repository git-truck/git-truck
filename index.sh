#!/bin/bash

cd ./parser
npm i
npm run build
cd ..
node ./parser/dist/index.js --path $1 --out ./app/src/data.json
cd ./app
npm i
npm run start

