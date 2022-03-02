# git-visual
Visualizing a Git repository

## Usage


### Prerequisites

Node.js, npm, and git.

### Running the tool

From the root of this repository, run:

```bash
index.sh <args>
```
or
```bash
./index.sh <args>
```
where args can be:
```
  --path <path to git repository> (default: current directory)
  --out <output path for json file> (default: ./app/src/data.json)
  --branch <branch name> (default: current branch)
```

For example, if you cloned this repository to `/home/user/git-visual`, run:

```
./start.sh --path ../<repo i want to visualize>
```

To run the tool against `git-visual` it self, run `./start.sh` without any arguments.

### Development

To run the tool in development mode with hot reloading, run:

```
dev.sh <args>
```

It takes the same arguments as `start.sh`.
