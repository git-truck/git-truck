# Git Truck 🚛

Gives a truckload of visualizations of your repository, and lets you find out if your project has a good [truck factor](https://www.agileadvice.com/2005/05/15/agilemanagement/truck-factor/)!

Get an overview over your git repo. See your folder-structure, which users have contributed most to which files, and more.

![How the tool looks](https://imgur.com/eb8x95g)

## [Get started](#get-started)
1. Make sure you have nodejs installed by running `node --version`. If not, you can download it [here](https://nodejs.org/en/). You will also need to have Git installed.
2. In your favorite shell (for example cmd, PowerShell, etc.), navigate to the root directory of a git project you want to visualize.
3. Execute the command `npx git-truck@latest`. Click `y` if it asks you to download the tool. A blank browser-window will open and Git Truck will now start analyzing your project (This might take a while to run, especially on big projects. You can follow the progress in your terminal). If you get an error in the terminal, you can try to run `npm i -g git-truck@latest` and then run `git-truck` instead.
4. When the Git Truck is done analyzing your project, it will show the visualization in your browser. Enjoy!

## [I got an error or I want to give feedback, what do i do?](#i-got-an-error-what-do-i-do)
Please open an issue [here](https://github.com/git-truck/git-truck/issues) where you describe your problem. Please include git version, node version, npm version, operating system, and an image of the problem is great too!

If you have any suggestions about new features, or things that you think should be different, also feel free to open an issue.

## [Why does this exist?](#why-does-this-exist)
This tool was made as part of a bachelors degree project by four student from the IT University of Copenhagen. We want to find out to which people, and in which cases a tool like this is useful.

We hope that you also learn something new about your repositories by using the tool!

## [Prerequisites](#prerequisites)

This tool is tested to work with:

- Node.js 16.13
- npm 6.14
- git 2.35

## [Advanced use](#advanced-use)

Run `npx git-truck` in the root of a git repository, that you want to visualize:

```sh
npx git-truck [args]
```

#### [Arguments](#arguments)

|    arg     |                               description                               |   default value    |
| :--------: | :---------------------------------------------------------------------: | :----------------: |
| `--branch` |                               branch name                               | checked out branch |
|  `--path`  |                         path to git repository                          | current directory  |
|  `--log`   | output log level. See [here](./src/analyzer/log.server.ts) for values |          -         |

### [Configuration](#configuration)

You can add a `truckconfig.json` file to the root of your project, where you can define the arguments you want.
Additionally you can define which git-aliases should be considered as the same person.
You can also define files to ignore.
Example:

```json
{
  "log": "debug",
  "branch": "main",
  "unionedAuthors": [
    ["Bob", "Bobby Bob"],
    ["Alice", "aliiii", "alice alice"]
  ],
  "hiddenFiles": ["package-lock.json", "*.bin", "*.svg"]
}
```

### [Development](#development)

1. Install dependencies with `npm install`
2. Run git-truck in development mode with:

```sh
npm run dev
```

_or using yarn:_ `yarn dev`

This starts the app in development mode, rebuilding assets on file changes.

**Note:**
If you want to provide args to the parser, you need to run remix and node separately in two different terminals:

```
npm run dev:remix
```

and

```
npm run dev:node -- <args>
```

For arguments, see [Arguments](#arguments).

### [Husky](#husky)

To enable husky, run `npx husky install`.

### [Clean up](#clean-up)

To clean up build artefacts, cached analyzations, etc., run:

```
npm run clean
```
