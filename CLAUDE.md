# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development
npm run dev              # Start Remix dev server with HMR

# Build
npm run build            # Build Remix app + CLI (remix build && tsup src/cli.ts)
npm run build-cli        # Build only CLI entry point
npm start                # Build and run the CLI

# Testing
npm test                 # Run all tests (E2E + unit)
npm run test:unit        # Jest unit tests (src/**/*.test.ts)
npm run test:e2e         # Playwright E2E tests (e2e/)
npm run test:e2e:headed  # E2E tests with browser visible

# Code Quality
npm run check:write      # Format + lint with auto-fix
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint only
npm run format:check     # Prettier check only
```

## Architecture Overview

Git Truck is a CLI tool that launches a Remix web app to visualize git repository history using D3.js.

### Data Flow
```
CLI (cli.ts) → Express server → Remix routes → React contexts → D3 visualizations
                                     ↓
                              Git analysis (ServerInstance)
                                     ↓
                              DuckDB cache (/tmp/git-truck-cache/)
```

### Key Directories

- **`src/analyzer/`** - Git repository analysis engine (server-side)
  - `ServerInstance.server.ts` - Main orchestrator; multi-threaded git log parsing
  - `DB.server.ts` - DuckDB interface for caching analysis results
  - `GitCaller.server.ts` - Executes git CLI commands
  - `InstanceManager.server.ts` - Manages one ServerInstance per repo/branch

- **`src/routes/`** - Remix file-based routing
  - `_index.tsx` - Landing page listing git repos in directory
  - `$repo.$.tsx` - Main visualization route (splat route for repo/branch)
  - `commits.tsx`, `commitcount.tsx`, `authordist.tsx` - Data API routes

- **`src/components/`** - React UI components
  - `Chart.tsx` - Main D3 treemap/circlepack visualization
  - `Options.tsx`, `Settings.tsx` - User controls

- **`src/contexts/`** - React Context for global state
  - `DataContext.ts` - Repository data from server
  - `MetricContext.ts` - Color metric calculations
  - `OptionsContext.ts` - User preferences (chart type, depth, etc.)

- **`src/metrics/`** - Visualization coloring algorithms
  - Each metric determines file colors: file type, commit count, top contributor, last changed

### Path Alias

Use `~/*` to import from `src/*` (configured in tsconfig.json):
```typescript
import { something } from "~/analyzer/model"
```

## Testing Notes

- Unit tests use Jest with ts-jest preset
- E2E tests use Playwright (Chromium only)
- E2E tests start the CLI with `--headless --invalidate-cache`
- Run `npm run build` before E2E tests (handled automatically by pretest script)

## Key Patterns

- **Server-side files**: Use `.server.ts` suffix for code that should only run on server
- **DuckDB caching**: Analysis results cached in `/tmp/git-truck-cache/{repo}_{branch}.db`
- **Multi-threaded analysis**: Large repos split commit history across 2-4 threads
- **Remix loaders**: Return deferred promises for streaming SSR
