# Contributing to Git Truck

Thank you for your interest in contributing! This document provides guidelines for developing on the project.

For a high-level overview of the project architecture, tech stack, and key commands, please refer to [AGENTS.md](./AGENTS.md).

## Getting Started

1. **Prerequisites**: Ensure you have [Bun](https://bun.sh/) installed.
2. **Clone the repository**:

   ```sh
   git clone https://github.com/git-truck/git-truck.git
   cd git-truck
   ```

3. **Install dependencies**:

   ```sh
   bun install
   ```

## Development Workflow

### Running the Dev Server

There are two primary ways to run the application during development:

1. **Using Bun (Preferred)**:
   Runs the CLI using the Bun runtime.

   ```sh
   bun dev
   ```

2. **Using Node/TSX**:
   Runs the CLI using `tsx` (via Node).

   ```sh
   node --run dev:node
   ```

### Testing Globally

After building the project, you can install it globally to test it on other repositories:

```sh
npm install -g .
```

When done testing, you can run

```sh
npm uninstall -g git-truck
```

### Building and Testing

For a complete list of commands for building, testing, linting, and formatting, please refer to the **Key Commands** section in [AGENTS.md](./AGENTS.md).

## Commit Guidelines

We follow **Conventional Commits** to automate versioning and changelogs. Please use the following prefixes:

- `feat:` for new features (triggers minor version bump)
- `fix:` for bug fixes (triggers patch version bump)
- `chore:` for maintenance tasks
- `BREAKING CHANGE:` (in footer or with `!`) for breaking changes (triggers major version bump)

**Examples:**

| Commit Message                          | Version Bump           |
| :-------------------------------------- | :--------------------- |
| `feat: add new visualization`           | Minor (1.0.0 -> 1.1.0) |
| `fix: calculate truck factor correctly` | Patch (1.0.0 -> 1.0.1) |
| `feat!: remove legacy API`              | Major (1.0.0 -> 2.0.0) |

## Release Process

Releases are automated via GitHub Actions on successful merges to `main`.

### Experimental Releases

To publish an experimental release (requires NPM authentication with 2FA):

```sh
bun pub-exp <OTP>
```

### Prerelease

To publish a prerelease version:

```sh
bun pub-pre <OTP>
```

## Additional Tools

- **Husky**: Enable Git hooks with `bunx husky install`.
- **Clean**: Remove build artifacts with `bun clean`.
- **Benchmark**: Measure installation/start time with `bun ./scripts/benchmark.mjs`.
