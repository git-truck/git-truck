# git-truck

## 4.0.0

### Major Changes

- 9542010: Allow user to automatically group related contributors based on matching git username & email.

  **BREAKING CHANGE** Database required new fields that cannot be automatically migrated, therefore requires invalidation of cache

- c0c58a4: - Automatically version and clear stale cache.
  - Allow users to abort an analysis.

  **BREAKING CHANGE** Database required new fields that cannot be automatically migrated, therefore requires invalidation of cache

### Minor Changes

- 75967a6: Add new metric: Contributors, which allows exploring the footprint of individual contributors across a project. Unlike Top Contributor, this metric colors any file that the contributor has ever changed. This is useful for exploring areas of domain expertise etc.
- 657fd3f: Overhaul legend / inspection interfaces
- f98ebc6: Set up react-compiler to improve application performance and responsiveness.

## 3.3.1

### Patch Changes

- 6a9fb01: Improve CLI env handling, update dev scripts, and fix release workflow
