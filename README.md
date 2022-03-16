# Git Truck 🚛

_Visualizing a Git repository_

Get an overview over your git repo. See your folder-structure, which users have contributed most to which files, and more.

## [Prerequisites](#prerequisites)

This projected is tested to work with:

- Node.js 16.13
- npm 6.14
- git 2.35

## [Usage](#usage)

Run the tool like this:

```sh
npx git-truck [--path <path>] [--branch <name>] [--out <path>] [--log <path>]
```
You can also install it globally:

```sh
npm install -g git-truck
```
And then run it like

```sh
git-truck [--path <path>] [--branch <name>] [--out <path>] [--log <path>]
```

#### [Arguments](#arguments)

|    arg     |   default value    |                               description                               |
| :--------: | :----------------: | :---------------------------------------------------------------------: |
|  `--path`  | current directory  |                         path to git repository                          |
| `--branch` | checked out branch |                               branch name                               |
|  `--out`   |    ./data.json     |                        output path for data file                        |
|  `--log`   |        null        | output log level. See [here](./app/parser/src/log.server.ts) for values |

## [Uninstall](#uninstall)
Uninstall the tool by running `npm uninstall -g git-truck` or `sudo npm uninstall -g git-truck`

## [Development](#development)

After dependencies have been installed, run
```
npx remix setup node
```
to setup remix.

Now you can run the tool in development mode:

In the root of the project, run the following from your terminal:

```sh
npm run dev -- <args>
```

_or using yarn:_ `yarn dev <args>`

For arguments, see [Arguments](#arguments).

This starts the app in development mode, rebuilding assets on file changes.

### [Husky](#husky)

To enable husky, run `npx husky install`.

## Clean up

To clean up build artefacts, etc. run:

```
npm run clean
```
