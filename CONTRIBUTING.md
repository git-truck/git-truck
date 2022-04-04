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