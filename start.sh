#!/bin/bash

# Build app if app/build directory does not exists
if [ ! -d "./app/build" ]; then
    echo "Installing app dependencies..."
    cd ./app && npm install --silent
    clear
    echo "Building app..."
    npm run build --silent
    cd ..
    clear
fi

# Run parser with arguments
./parse.sh --out ./app/build/data.json $@

echo "Serving app..."
# Set npm_config_yes=true
export npm_config_yes=true
cd ./app/build && npx serve@latest
