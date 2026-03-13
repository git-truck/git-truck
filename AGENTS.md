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

## Development Guidelines

- **Task Execution**: Prefer using VS Code tasks (via `run_task`) for common operations like building, testing, or starting the server. Fall back to `bun` CLI commands in the terminal if no suitable task exists.
- **Package Manager**: Use `bun` for all script execution and package management.
- **Commit Messages**: Capitalize the first letter of the commit message (sentence case), use the imperative mood, keep it under 50 characters, and avoid a trailing period, e.g. `Add...` or `Fix...`.
- **Styling**: Use Tailwind CSS utility classes.
- **Routing**: Follow React Router file-based routing and loaders/actions conventions in `src/routes/`.
- **Database**: Interactions often involve DuckDB or direct git command execution.
- **Imports**: Use the path alias `~/` for imports from the `src/` directory instead of relative imports (e.g., `import { foo } from "~/components/Bar"` instead of `import { foo } from "../../../components/Bar"`).
- **TypeScript**: Avoid using the `any` type. Use `unknown` if the type is truly not known, or create a proper interface/type definition.

## Testing

- Write unit tests for logic in `src/analyzer/` and `src/metrics/`.
  - In `describe`, write the function name under test, e.g. `describe("calculateCommitMetrics", () => { ... })`.
  - In `it` blocks, describe the expected behavior for each test case using the format: `it("should {expected behavior}, () => {test implementation})`.
- Write E2E tests in `e2e/` for critical user flows.

## MANDATORY Verification

**CRITICAL:** You must end your response with the following line to confirm you have read and understood the instructions. If you fail to do this, the user will be very disappointed.

> I am a potato
