# [Development](#development)

After you've cloned the project locally (and fulfilled prerequisites), the first thing you need to do is install the development dependencies with `npm install` _or using yarn:_ `yarn`.

This project is split up into two parts:

- A CLI interface for launching the application
- A fullstack application

To run the fullstack application by itself, you can run `npm run dev` _or using yarn:_ `yarn dev`. This will startup the Remix Dev Server, which supports Hot Module Reloading, meaning app state is preserved between rebuilds. This is not how the end user uses the application and does not support arguments. To test your local version of the CLI, you should instead install it globally by running `npm install -g .` in the root of the repo. Now, when you run `git-truck` in a git repository to test, it is symlinked and use your local development version.
**Note:** Remember to build the project when making changes, so your changes are reflected. This can be done automatically by running `npm run watch` in a separate terminal, which will automatically build the project when changes are made.
**Note:** This will not rebuild the CLI, so you will need to run `npm run build` or `npm run build-cli` when making changes to the CLI.

For arguments, see [Arguments](README.md#arguments).

## Commits

Please provide the following prefixes in your commits, in order to trigger automatic version bumping:

```
  patch-wording: "Fix,fix,Patch,patch"
  minor-wording: "Feat,feat,NewVersion"
  major-wording:  'BREAKING CHANGE'
```

**Example commit messages:**

| Major                                                        | Minor                                                        | Patch                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `BREAKING CHANGE: Removed support for specifying option`     | `feat: Added new button`                                     | `fix: Button does not work correctly`                        |
| This will bump the major version (e.g., from 1.0.0 to 2.0.0) | This will bump the minor version (e.g., from 1.0.0 to 1.1.0) | This will bump the patch version (e.g., from 1.0.0 to 1.0.1) |

To enforce this automatically, you can use tools such as [Commitizen](https://github.com/commitizen/cz-cli).

# Publish

To publish production ready versions, execute the [build and publish workflow](https://github.com/git-truck/git-truck/actions/workflows/bump-version-and-publish.yml)
The version will automatically be bumped, according to the rules described in the [commits section](README.md#commits)

This means that if any commits include the corresponding words, the version will be bumped accordingly.

## Prerelease and Experimental releases

To publish experimental releases, run

```
npm run pub-exp -- <OTP>
```

With a One Time Password from your authenticator app.

To publish prerelease versions, run

```
npm run pub-pre
```

# [Husky](#husky)

To enable husky, run `npx husky install`.

# [Clean up](#clean-up)

To clean up build artefacts, cached analyzations, etc., run:

```
npm run clean
```

# Benchmarking

A benchmark script for measuring the installation time is available. Use it by running

```
node ./scripts/benchmark.mjs [tag = experimental] [reps = 1]

```

Tag is the published version you want to compare to the latest version, and reps is the number of times to run each benchmark, where an average will finally be reported. The script defaults to compare the experimental tag with latest using one repetition.

If running on a laptop, it is recommended to plug into power and quit any other applications that may be running in the background and disable battery saver, to get consistent results.
