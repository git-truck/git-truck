---
"git-truck": patch
---

Only parse tab-separated numstat records when gathering file changes. This prevents filenames in Git summary lines from producing invalid line counts and crashing repository analysis.
