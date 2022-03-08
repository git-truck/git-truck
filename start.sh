#!/bin/bash
clear
# Build app if app/build directory does not exists
if [ ! -d "./app/build/" ]; then
    echo "Installing app dependencies..."
    cd ./app && npm install --silent
    echo "Building app..."
    npm run build --silent

    # Capture exit code from parse script
    exit_code=$?

    cd ..

    # Exit script if exit code is not 0
    if [ $exit_code -ne 0 ]; then
        echo "Build failed with exit code $exit_code"
        exit $exit_code
    fi
fi

# Run parser with arguments
./parse.sh --out ./app/build/data.json $@

# Capture exit code from parse script
exit_code=$?

# Exit script if exit code is not 0
if [ $exit_code -ne 0 ]; then
  echo "Parser failed with exit code $exit_code"
  exit $exit_code
fi

echo "Serving app..."

# Set npm_config_yes=true
export npm_config_yes=true
cd ./app/build && npx serve@latest
