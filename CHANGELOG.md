# git-truck

## 5.0.0

### Major Changes

- 94ff46f: Handle merge commits properly by recording commit types in the database

  **BREAKING CHANGE**

  This change modifies the database schema to include an `isMerge` boolean field in the `commits` table, which indicates whether a commit is a merge commit. This allows for more accurate analysis and visualization of commit data, especially when dealing with complex commit histories that include merges.

## 4.1.0

### Minor Changes

- dc924f4: Add right sidebar
- 7b5cdd9: Add support for showing co-authors on the timeline

## 4.0.0

### Major Changes

- 9542010: Allow user to automatically group related contributors based on matching git username & email.

  **BREAKING CHANGE** Database required new fields that cannot be automatically migrated, therefore requires invalidation of cache

- c0c58a4: Automatically version and clear stale cache and allow users to abort an analysis.

  **BREAKING CHANGE** Database required new fields that cannot be automatically migrated, therefore requires invalidation of cache

- e05eb8c: Revamp the timeline and it's interactions across the application. Allow the visualization of contributors across project history.

### Minor Changes

- 75967a6: Add new metric: Contributors, which allows exploring the footprint of individual contributors across a project. Unlike Top Contributor, this metric colors any file that the contributor has ever changed. This is useful for exploring areas of domain expertise etc.
- 657fd3f: Overhaul legend / inspection interfaces
- c3d7e69: Decouple metrics and legend
- f98ebc6: Set up react-compiler to improve application performance and responsiveness.

## 3.3.1

### Patch Changes

- 6a9fb01: Improve CLI env handling, update dev scripts, and fix release workflow
