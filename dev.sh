#!/bin/bash

# Run parser with arguments
echo "Running parser"
./parse.sh --out ./app/public/data.json $@

echo "Installing app dependencies..."
cd ./app && npm install --silent
clear

echo "Running app..."
npm run start --silent
