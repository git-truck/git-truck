---
"git-truck": major
---

Handle merge commits properly by recording commit types in the database

**BREAKING CHANGE**

This change modifies the database schema to include an `isMerge` boolean field in the `commits` table, which indicates whether a commit is a merge commit. This allows for more accurate analysis and visualization of commit data, especially when dealing with complex commit histories that include merges.
