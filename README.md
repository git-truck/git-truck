# Git Truck 🚛

Get a truckload of visualizations for your git repository, and find out if your project has a good [truck factor](https://www.agileadvice.com/2005/05/15/agilemanagement/truck-factor/)!

Git Truck gives an overview of your folder-structure, which users have contributed most to which files, and more.

![billede](https://user-images.githubusercontent.com/23435481/161273053-a9420c2b-2b80-4f73-a78e-39dec822fab1.png)

## [Prerequisites](#prerequisites)

To use Git Truck, you will need to have the following programs installed:

- [Node.js](https://nodejs.org/en/) 16.13 or newer
- npm 6.14 or newer
- [git](https://git-scm.com/downloads) 2.29 or newer

To check if these programs are installed, and what version you have, run `node --version`, `npm --version` and `git --version`. If any of these are not install on your system, or are just very old, they can be installed from the links above. Note that `npm` is installed along with `node`.

## [Get started](#get-started)

1. In your favorite shell (for example cmd, PowerShell, etc.), navigate to the root directory of a git project you want to visualize.
2. Execute the command `npx git-truck@latest`. Click `y` if it asks you to download the tool. A blank browser-window will open and Git Truck will now start analyzing your project (This might take a while to run, especially on big projects, you can follow the progress in your terminal). If you get an error in the terminal, you can try installing the tool globally by running `npm i -g git-truck@latest` and then run `git-truck` instead.
3. When Git Truck is done analyzing your project, it will show the visualization in your browser. Enjoy!

## [I got an error or I want to give feedback, what do i do?](#i-got-an-error-or-i-want-to-give-feedback-what-do-i-do)

Please open an issue [here](https://github.com/git-truck/git-truck/issues) where you describe your problem. Please include git version, node version, npm version, operating system, and an image of the problem would be great too!

If you have any suggestions about new features, or things that you think should be different, also feel free to open an issue.

## [Advanced use](#advanced-use)

Run `npx git-truck` in the root of a git repository, that you want to visualize:

```sh
npx git-truck [args]
```

### [Arguments](#arguments)

|    arg     |                              description                              |   default value    |
| :--------: | :-------------------------------------------------------------------: | :----------------: |
| `--branch` |                              branch name                              | checked out branch |
|  `--path`  |                        path to git repository                         | current directory  |
|  `--log`   | output log level. See [here](./src/analyzer/log.server.ts) for values |         -          |
|  `--port`  |                      port to use for the program                      |        3000        |

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
