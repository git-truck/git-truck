#!/bin/bash

rm -f ./app/public/data.json
rm -f ./app/build/data.json
# Print "installing dependencies"

# Build parser if parser/dist directory does not exists
if [ ! -d "./parser/dist/" ]; then
    cd ./parser
    clear
    echo "Installing parser dependencies..."
    npm install --silent
    clear
    echo "Building parser..."
    npm run build --silent
    cd ..
    clear
fi

# Pass all arguments to parser
node ./parser/dist/index.js $@
clear
