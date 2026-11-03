---
"git-truck": patch
---

Fix the production build and the dev server after the React Router 8 upgrade. The server bundle did not export the Express app and did not include its dependencies, so a package built from `main` could not start, and `nuqs` crashed server rendering of `/view` in dev.
