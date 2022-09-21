# [Development](#development)

1. Install dependencies with `npm install`
2. Run git-truck in development mode with:

```sh
npm run dev -- <args>
```

To test your local version of the CLI, you can install it globally by running `npm install -g .` in the root of the repo. Now, when you run `git-truck` in a git repository to test, it will symlink and use your local development version. Remember to build the project, so your changes are reflected. This can be done automatically by running `npm run watch` in a separate terminal.

_or using yarn:_ `yarn dev`

This starts the app in development mode, rebuilding assets on file changes.

For arguments, see [Arguments](#arguments).

# [Husky](#husky)

To enable husky, run `npx husky install`.

# [Clean up](#clean-up)

To clean up build artefacts, cached analyzations, etc., run:

```
npm run clean
```
