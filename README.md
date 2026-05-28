# Git Truck 🚛

[![Git Truck on NPMX](https://img.shields.io/npm/v/git-truck)](https://www.npmx.dev/git-truck)

Git Truck is a local, interactive visualization workspace for Git repositories, built for inspecting a codebase through structure, commit activity, authorship, and history.

- Browse and zoom into the repository structure
- See _who_ worked _where_, _when_ and _what_ they worked on
- Spot active areas of the codebase
- Explore how the codebase changed over time

Git Truck can assist you in quickly answering questions like:

| _How is the repository structured?_                                                       | _Where has the project been active recently?_                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| ![Example of file type visualization](./docs/examples/npmx%20-%20file%20type.png)         | ![Example of most changed files recently](./docs/examples/npmx%20-%20commits%20-%20last%20changed.png) |
| _**Who has changed the most lines per file?**_                                            | _**Where and when have specific contributors worked?**_                                                |
| ![Inspecting specific contributor activity](./docs/examples/npmx%20-%20top%20churner.png) | ![Example of the contributors metric](./docs/examples/npmx%20-%20specific%20contributors.png)          |

## Why Git Truck?

- Runs locally: no tracking, cloud storage, remote servers, ads, or subscription
- Works offline
- Works with any Git repository

## Install

Requires [Node.js](https://nodejs.org/en/) and [Git](https://git-scm.com/downloads).

```sh
npm install -g git-truck@latest
```

## Usage

Open a repository:

```sh
cd path/to/repository
git truck
```

Or pass a path directly:

```sh
git truck path/to/repository
git truck path/to/folder-with-repositories
```

When the path contains multiple repositories, Git Truck opens a repository browser. Otherwise, it opens the visualization in your default browser.

Run `git truck --help` for advanced options.

## Troubleshooting

- If the browser does not open automatically, copy or click the URL from the terminal.
- Large repositories can take a little while to analyze the first time and may feel slow to navigate and interact with.

## Learn more

- [Feature overview](https://git-truck.github.io/git-truck/docs)
- [Research papers](https://github.com/git-truck/papers/blob/master/README.md)
- [Issue tracker](https://github.com/git-truck/git-truck/issues)
