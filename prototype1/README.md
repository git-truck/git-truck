# Prototype 1

This is a folder visualization prototype.


This project uses npm to install dependencies and `package-lock.json` as a lockfile, so please do not commit `package-lock.json` to this folder. When adding new dependencies, please use `npm install <package>` instead of `yarn add <package>`.`

## Running

Start by running `npm install` in the root of this folder.

Then, use `npm run dev` to start the development server.

## Debug mode

A debug mode can be enabled by adding `?debug=true` to the URL.

## Generating data from the parser

To generate data from the parser to use in the visualization, run `npm run parse`
