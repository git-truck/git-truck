# Git Truck 🚛

_Visualizing a Git repository_

Get an overview over your git repo. See your folder-structure, which users have contributed most to which files, and more.

## [Prerequisites](#prerequisites)

This projected is tested to work with:

- Node.js 16.13
- npm 6.14
- git 2.35

## [Usage](#usage)

1. Install dependencies with `npm install`
2. Build the project with `npm run build`
3. Then run the app in production mode:

```sh
npm start -- [--path <path>] [--branch <name>] [--out <path>] [--log <path>]
```

#### [Arguments](#arguments)

|    arg     |   default value    |                               description                               |
| :--------: | :----------------: | :---------------------------------------------------------------------: |
|  `--path`  | current directory  |                         path to git repository                          |
| `--branch` | checked out branch |                               branch name                               |
|  `--out`   |    ./data.json     |                        output path for data file                        |
|  `--log`   |        null        | output log level. See [here](./app/parser/src/log.server.ts) for values |

_or using yarn:_ `yarn start <args>`

## [Development](#development)

In the root of the project, run the following from your terminal:

```sh
npm run dev -- <args>
```

_or using yarn:_ `yarn dev <args>`

For arguments, see [Arguments](#arguments).

This starts the app in development mode, rebuilding assets on file changes.

## Clean up

To clean up build artefacts, etc. run:

```
npm run clean
```
