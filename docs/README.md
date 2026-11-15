# Git Truck - visualize your repo

Git Truck allows you to get an understanding of how your repository is structured, where there has been the most activity at different points in time, and who worked on which parts of the codebase.

## Local analysis of the `.git` folder

🔒 Git Truck analyzes your project history using the local `.git` folder. It runs **completely locally**, so your code stays on your machine and is **never uploaded to the cloud**.

## How does it work?

For each file in your repository, Git Truck lets you map metrics onto it:

- the size of files, such as file size in bytes or number of commits,
- the color of files, such as the number of line changes or the top author.

You can mix and match these metrics to answer different questions about your project. The examples below show a few questions Git Truck can help your team explore.

### 🕑 Where has the project been active recently?

![Git Truck visualization showing recently changed files in npmx](<./examples/npmx - commits - last changed.png>)

Example from [npmx.dev](https://github.com/npmx-dev/npmx.dev), a feature-rich alternative to npmjs.com.

### 👨‍💻 Are we overreliant on one developer?

![Git Truck visualization showing top churners in Supabase](<./examples/supabase - top churner.png>)

Example from [Supabase](https://github.com/supabase/supabase), an open source Firebase alternative.

### ⚠️ Do some files have extreme levels of activity, indicating poor separation of concerns?

![Git Truck visualization showing high line-change activity in Pandas](<./examples/pandas - line changes.png>)

Example from [Pandas](https://github.com/pandas-dev/pandas)

### 🛠️ Who is responsible for different subsystems?

![Git Truck visualization showing authorship by subsystem in npmx](<./examples/npmx - top churner.png>)

Example from [npmx.dev](https://github.com/npmx-dev/npmx.dev), a feature-rich alternative to npmjs.com.

### 📂 What is the folder structure of a complex project?

![Git Truck visualization showing the V8 repository folder structure](<./examples/v8 structure.png>)

Example from [V8](https://github.com/v8/v8)

### 👨‍💻 Where and when have specific contributors worked?

In this example, we can see that during the selected time interval, the selected contributors mostly worked in isolated areas of the codebase. For example, Maja contributed prominently to the `teacher` folder. There is also some overlap, such as in `i18n`, which makes sense because internationalization is a cross-cutting concern.

![Git Truck visualization showing selected contributor activity in zeeguu/web](<./examples/zeeguu web contributors.png>)

Example from [zeeguu/web](https://github.com/zeeguu/web)

## How to get started

The only requirements are:

- [Node.js](https://nodejs.org/en/) version 22 or newer
- [Git](https://git-scm.com/downloads) version 2.29 or newer

To run Git Truck, navigate to a repository, or a folder containing multiple repositories, and run `npx git-truck`. This will run the latest version of Git Truck without installing it globally.

To install the latest version of Git Truck globally, run `npm install -g git-truck@latest`. You can then run Git Truck from any repository using:

```sh
git truck
```

To update it later, run:

```sh
npm install -g git-truck@latest
```
