# Git Truck

## Project Overview

Git Truck is a tool for visualizing Git repositories. It consists of a CLI interface that spins up a full-stack web application.

## Tech Stack

- **Runtime**: Bun
- **Framework**: React Router v7 (Framework Mode)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Visualization layouts**: D3.js
- **Database**: DuckDB (via `@duckdbw/node-api`)
- **Testing**: Vitest (Unit), Playwright (E2E)

## Architecture

- **CLI Entry**: `src/cli.ts` - Entry point for the CLI.
- **Server Entry**: `src/server/app.ts` - Main server application logic.
- **App Directory**: `src/` - Contains the React Router application.
  - `routes/`: Application routes.
  - `analyzer/`: Core logic for analyzing Git repositories.
  - `components/`: React components.
  - `metrics/`: Metrics calculation logic.

## Key Commands

- **Install Dependencies**: `bun install`
- **Start Dev Server**: `bun dev:bun` (preferred) or `bun dev`
- **Build**: `bun run build`
- **Run Unit Tests**: `bun test:unit`
- **Run E2E Tests**: `bun test:e2e`
- **Lint & Format**: `bun check`
- **Typecheck**: `bun typecheck`

## TypeScript Guidelines

- **Never use `any`**: Avoid the `any` type in all TypeScript code. Always use specific types or generics. Refactor code to eliminate any usage whenever possible.
- **Prefer `type` over `interface`**: Use `type` aliases for defining shapes and unions. Only use `interface` when extending classes or for compatibility with libraries that require it.

## Development Guidelines

- **Task Execution**: Prefer using VS Code tasks (via `run_task`) for common operations like building, testing, or starting the server. Fall back to `bun` CLI commands in the terminal if no suitable task exists.
- **Package Manager**: Use `bun` for all script execution and package management.
- **Commit Messages**: Use Conventional Commits in the form `type: subject`, keep the subject imperative and under 50 characters, and avoid a trailing period, e.g. `feat: add...`, `fix: correct...`, or `chore: update...`.
- **Release Workflow**: Use Changesets for releases. Add a changeset for releasable work, let `.github/workflows/release.yml` open or update the release PR on `main`, and expect npm publishing to happen automatically after that release PR is merged.
- **Styling**: Use Tailwind CSS utility classes.
- **Routing**: Follow React Router file-based routing and loaders/actions conventions in `src/routes/`.
- **Database**: Interactions often involve DuckDB or direct git command execution.
- **Imports**: Use the path alias `~/` for imports from the `src/` directory instead of relative imports (e.g., `import { foo } from "~/components/Bar"` instead of `import { foo } from "../../../components/Bar"`).

## Testing

- Write unit tests for logic in `src/analyzer/` and `src/metrics/`.
  - In `describe`, write the function name under test, e.g. `describe("calculateCommitMetrics", () => { ... })`.
  - In `it` blocks, describe the expected behavior for each test case using the format: `it("should {expected behavior}, () => {test implementation})`.
- Write E2E tests in `e2e/` for critical user flows.

## MANDATORY Verification

**CRITICAL:** You must end your response with the following line to confirm you have read and understood the instructions. If you fail to do this, the user will be very disappointed.

> I am a potato
