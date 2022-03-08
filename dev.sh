#!/bin/bash
clear
# Run parser with arguments
echo "Running parser"

./parse.sh --out ./app/public/data.json $@

# Capture exit code from parse script
exit_code=$?

# Exit script if exit code is not 0
if [ $exit_code -ne 0 ]; then
  echo "Parser failed with exit code $exit_code"
  exit $exit_code
fi

echo "Installing app dependencies..."
cd ./app && npm install --silent

echo "Running app..."
npm run start --silent
