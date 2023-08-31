# Git Truck 🚛 &middot;
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/git-truck/git-truck/blob/main/LICENSE)
[![Git Truck on NPM](https://img.shields.io/npm/v/git-truck)](https://www.npmjs.com/git-truck)

![Demo](demo.gif)

Git-Truck provides you with a truckload of visualizations for your git repository, and helps you find out if your project has a good [truck factor](https://www.agileadvice.com/2005/05/15/agilemanagement/truck-factor/):

| | |
|-|-|
| The files in your system where you have a single contributor (i.e., truck-factor = 1) | <img width="1912" alt="image" src="https://user-images.githubusercontent.com/464519/167393939-8d683732-4583-44fe-99a3-36c818761bcb.png"> |
| You can see how the various developers contribute to your codebase | <img width="1913" alt="image" src="https://user-images.githubusercontent.com/464519/167394548-ca66665a-a699-44d7-8a97-bc7309c72f8a.png"> |
| You can determine which parts of the system that are most often changed | <img width="1912" alt="image" src="https://user-images.githubusercontent.com/464519/167395118-6a4f50f4-5f37-4e0d-bcc8-144797b83e65.png"> |


### What makes Git Truck different?

- Private by design
- Works offline
- Git provider agnostic - Works with any Git repository
- No tracking, no ads, no data mining, no analytics, no cloud, no servers


## [Prerequisites](#prerequisites)

To use Git Truck, you will need to have the following programs installed:

- [Node.js](https://nodejs.org/en/) 16.13 or newer
- npm 6.14 or newer
- [git](https://git-scm.com/downloads) 2.29 or newer

To check if these programs are installed, and what version you have, run `node --version`, `npm --version` and `git --version`. If any of these are not installed on your system, or are just very old, they can be installed from the links above. Note that `npm` is installed along with `node`.

## [Get started](#get-started)

1. Within a git repository, or a directory containing git repositories, run the command `npx -y git-truck`.
2. The application will now open in your default browser.

**Git Truck is part of a research study, so please fill out our [short survey](https://forms.gle/9wCCAw6zae7wuwZQ6) after trying out the tool. Thanks!**

## [I got an error or I want to give feedback, what do i do?](#i-got-an-error-or-i-want-to-give-feedback-what-do-i-do)

Please open an issue [here](https://github.com/git-truck/git-truck/issues) where you describe your problem. Please include git version, node version, npm version, operating system, and an image of the problem would be great too!

If you have any suggestions about new features, or things that you think should be different, also feel free to open an issue.

## [Advanced use](#advanced-use)

Run `npx git-truck` in the root of a git repository, that you want to visualize:

```sh
npx git-truck [args]
```

### [Arguments](#arguments)

|         arg          |                              description                              |   default value    |
| :------------------: | :-------------------------------------------------------------------: | :----------------: |
|       `--path`       |                 path to a folder or a git repository                  | current directory  |
|       `--log`        | output log level. See [here](./src/analyzer/log.server.ts) for values |         -          |
|       `--port`       |                      port to use for the program                      |        3000        |
| `--invalidate-cache` |                    bypass analyzer cache manually                     |         -          |
| `--headless`         |       run the program without opening the browser                     |         -          |

**Note:** Using `--invalidate-cache` will cause the analyzer to run every time the client talks to the server.

### [Configuration](#configuration)

You can add a `truckconfig.json` file to the root of your project, where you can define the arguments you want.
Additionally you can define which git-aliases should be considered as the same person using `unionedAuthors`. If provided, the first name in the array is used as the name of the person.
You can also define files to ignore.

**Example:**

```json
{
  "log": "debug",
  "branch": "main",
  "unionedAuthors": [
    ["Bob", "Bobby Bob"],
    ["Alice", "aliiii", "alice alice"]
  ],
  "hiddenFiles": ["package-lock.json", "*.bin", "*.svg"],
  "invalidateCache": true
}
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=git-truck/git-truck&type=Date)](https://star-history.com/#git-truck/git-truck&Date)
