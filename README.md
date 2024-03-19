# Git Truck 🚛 &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/git-truck/git-truck/blob/main/LICENSE) [![Git Truck on NPM](https://img.shields.io/npm/v/git-truck)](https://www.npmjs.com/git-truck)

Git-Truck is a tool that provides you with a truckload of visualizations for your git repository, and helps you find out if your project has a good [truck factor](https://en.wikipedia.org/wiki/Bus_factor). 

| Git Truck can help you figure out: | |
|-|-|
| Where the files in your codebase that only have a single contributor are (i.e., truck-factor = 1) | <img width="1912" alt="image" src="https://github.com/git-truck/git-truck/assets/1959615/1cc20716-0927-4aba-8d7d-115626bc445f"> |
| How the various developers contribute to your codebase | <img width="1913" alt="image" src="https://github.com/git-truck/git-truck/assets/1959615/780852f3-28de-44d2-ab79-e4ef420c3736"> |
| Which parts of the system that are most often changed | <img width="1912" alt="image" src="https://github.com/git-truck/git-truck/assets/1959615/8ca5f0b9-798f-40cd-b64e-de2fee00a5c3"> |

## [What makes Git Truck different?](#what-makes-git-truck-different)

🔒 Private by design

🏝️ Works offline

🤷 Git provider agnostic - works with any git repository

😊 No tracking, no ads, no data mining, no analytics, no cloud, no servers

## [Prerequisites](#prerequisites)

> [!IMPORTANT]  
> To use Git Truck, you will need to have the following programs installed:
> - [Node.js](https://nodejs.org/en/) 18.0.0 or newer and npm 10.0 or newer
> - [git](https://git-scm.com/downloads) 2.29 or newer
> 
> Check your installed versions using `node --version`, `npm --version` and `git --version`. 

> [!TIP]
> The latests versions of Node and git can be installed from the links above. 

> [!Note]
> `npm` is automatically installed along with `node`.

## [Get started](#get-started)

1. Within a git repository, or a directory containing git repositories, run the command

```bash
npx -y git-truck
```

2. The application will now open in your default browser.

![Demo](demo.gif)

## [Feedback](#feedback)

Please open an issue [here](https://github.com/git-truck/git-truck/issues) where you describe your problem or feature request. For bug reports, please include git version, Node version, npm version, operating system, and an image of the problem would be great too!

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

> [!CAUTION]  
> Using `--invalidate-cache` will cause the analyzer to run every time the client talks to the server. This can be very slow if working with large repositories.

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
