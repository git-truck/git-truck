---
"git-truck": patch
---

Fix opening a repository from the repository list. After the React Router 8 upgrade the redirect that completes the `/view` URL kept the internal `.data` suffix, so a click ended on `/browse?path=view.data` ("Path not found").
