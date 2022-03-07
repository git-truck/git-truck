# git-visual
Visualizing a Git repository

## Usage


### Prerequisites

Node.js, npm, and git.

### Running the tool

From the root of this repository, run:

```bash
start.sh <args>
```
or
```bash
./start.sh <args>
```
where args can be:
```
  --path <path to git repository> (default: current directory)
  --branch <branch name> (default: current branch)
  --out <output path for json file> (default: ./app/public/data.json)
```

For example, if you cloned this repository to `/home/user/git-visual`, run:

```
./start.sh --path ../<repo i want to visualize>
```

To run the tool against `git-visual` it self, run `./start.sh` without any arguments.

If you are unable to run the script on *nix systems, make sure that you have set the correct permissions.
```
chmod +x ./start.sh
chmod +x ./parse.sh
chmod +x ./clean.sh
chmod +x ./dev.sh
```

### Development

To run the tool in development mode with hot reloading, run:

```
dev.sh <args>
```

It takes the same arguments as `start.sh`.
