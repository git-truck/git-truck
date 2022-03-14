#!/bin/bash

rm -f ./app/public/data.json
rm -f ./app/build/data.json

# Build parser if parser/dist directory does not exists
if [ ! -d "./parser/dist/" ]; then
    cd ./parser
    echo "Installing parser dependencies..."
    npm install --silent
    echo "Building parser..."
    npm run build --silent
    # Capture exit code from parse build
    exit_code=$?

    # Exit script if exit code is not 0
    if [ $exit_code -ne 0 ]; then
        echo "Parser build failed with exit code $exit_code"
        exit $exit_code
    fi

    cd ..
fi

# Pass all arguments to parser
node ./parser/dist/index.js $@ --out ./data.json
