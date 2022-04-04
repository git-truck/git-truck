# Git Truck 🚛

Get a truckload of visualizations for your git repository, and find out if your project has a good [truck factor](https://www.agileadvice.com/2005/05/15/agilemanagement/truck-factor/)!

Git Truck gives an overview of your folder-structure, which users have contributed most to which files, and more.

![billede](https://user-images.githubusercontent.com/23435481/161273053-a9420c2b-2b80-4f73-a78e-39dec822fab1.png)

## [Prerequisites](#prerequisites)

To use Git Truck, you will need to install the following programs:

- Node.js 16.13 or newer
- npm 6.14 or newer
- git 2.29 or newer

To check if these programs are installed, and what version you have, run `node --version`, `npm --version` and `git --version`. If any of these are not install on your system, or are just very old, they can be installed on these sites: [node](https://nodejs.org/en/), [git](https://git-scm.com/downloads). (Note that `npm` is installed along with `node`)

## [Get started](#get-started)
1. In your favorite shell (for example cmd, PowerShell, etc.), navigate to the root directory of a git project you want to visualize.
2. Execute the command `npx git-truck@latest`. Click `y` if it asks you to download the tool. A blank browser-window will open and Git Truck will now start analyzing your project (This might take a while to run, especially on big projects. You can follow the progress in your terminal). If you get an error in the terminal, you can try running `npm i -g git-truck@latest` and then `git-truck` instead.
3. When the Git Truck is done analyzing your project, it will show the visualization in your browser. Enjoy!

## [The interface](#the-interface)

![interface-img](https://user-images.githubusercontent.com/55390848/161504380-7f9715cc-8b06-4cd3-b9f0-1221388f3a52.PNG)

Git Truck displays folders as transparent elements, with a small border, and files as colored elements. If you hover over a file, a tooltip will be displayed near your mouse, informing you about the files name, and what its color means.

1. Displays global information about the repository and the analyzed data. This is also where you can force a run of the analyzer.
2. These are the visualization options. Here you control how the visualization looks, and what metric is mapped to the colors.
3. The search bar allows you to search for specific elements. Type in what name you are searching for, and anything that matches will be highlighted. `Ctrl+F` will move your cursor here.
4. Shows you where you are looking in the folder structure. Clicking on a name, will navigate back to that folder.
5. If you click on a file or a folder, this menu shows up to display detailed information about the clicked element. Note that clicking a folder, will also navigate to that folder.
6. This is the legend, it informs you about what all the colors mean.

## [I got an error or I want to give feedback, what do i do?](#i-got-an-error-what-do-i-do)
Please open an issue [here](https://github.com/git-truck/git-truck/issues) where you describe your problem. Please include git version, node version, npm version, operating system, and an image of the problem would be great too!

If you have any suggestions about new features, or things that you think should be different, also feel free to open an issue.

## [Why does this exist?](#why-does-this-exist)
This tool was made as part of a bachelors degree project by four student from the IT University of Copenhagen. We want to find out to which people, and in which cases, a tool like this is useful.

We hope that you also learn something new about your repositories by using the tool!

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
