#!/bin/bash

cd ./parser
clear
# Print "installing dependencies"
echo "Installing parser dependencies..."
npm install --silent
clear

echo "Building parser..."
npm run build --silent
clear



# Pass all arguments to index.js
cd .. && node ./parser/dist/index.js --out ./app/src/data.json $@
clear

echo "Installing app dependencies..."
cd ./app && npm install --silent
clear

echo "Building app..."
npm run build --silent
clear
npm_config_yes=true
echo "Serving app..."
cd build && npx serve -y

