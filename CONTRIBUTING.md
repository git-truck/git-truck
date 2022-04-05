# [Development](#development)

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

For arguments, see [Arguments](README.md#arguments).

# [Husky](#husky)

To enable husky, run `npx husky install`.

# [Clean up](#clean-up)

To clean up build artefacts, cached analyzations, etc., run:

```
npm run clean
```
