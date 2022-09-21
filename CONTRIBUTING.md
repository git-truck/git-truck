# [Development](#development)

After you've cloned the project locally (and fulfilled prerequisites), the first thing you need to do is install the development dependencies with `npm install` _or using yarn:_ `yarn`.

This project is split up into two parts:
- A CLI interface for launching the application
- A fullstack application

To run the fullstack application by itself, you can run `npm run dev` _or using yarn:_ `yarn dev`. This is not how the end user uses the application and does not support arguments. To test your local version of the CLI, you should instead install it globally by running `npm install -g .` in the root of the repo. Now, when you run `git-truck` in a git repository to test, it is symlinked and use your local development version.
**Note:** Remember to build the project when making changes, so your changes are reflected. This can be done automatically by running `npm run watch` in a separate terminal, which will automatically build the project when changes are made.
**Note:** This will not rebuild the CLI, so you will need to run `npm run build` or `npm run build-cli` when making changes to the CLI.

For arguments, see [Arguments](README.md#arguments).

# Publish
To publish production ready versions, the following steps should be taken:
 - Features should be merged back into main using a peer-reviewed pull request
 - This will automatically bump the minor version
 - Then, a new release can be published from the main branch by running `npm publish`

## Prerelease
To create test versions, you first need to bump the version. The first time this is done, you should consider what kind of prerelease you are making. This would typically by a preminor release. In that case, run

```bash
npm version preminor
```

When making multiple prereleases, you will then followingly use `npm version prerelease` to make extra prereleases. This will bump the prerelease version.

Then, for example, you can publish the new version by running `npm publish --tag next`. This will publish the new version under the `next` tag, which can be installed by running `npm install -g git-truck@next`. You can choose any tag, but use `next` for testing before publishing a production release and use `experimental` for experiments.

**Note:** It is **very important** to specify a tag when publishing prereleases, as otherwise the prerelease will be published as the latest version.


# [Husky](#husky)

To enable husky, run `npx husky install`.

# [Clean up](#clean-up)

To clean up build artefacts, cached analyzations, etc., run:

```
npm run clean
```
