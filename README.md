# git-visual
This tool helps you get an overview over your git repo. You can see your folder-structure, which users have contributed most to which files, and more.

## [Prerequisites](#prerequisites)

This project requires that Node.js, npm, and git are installed

## [Usage](#usage)

To display usage information, run

```
./start.sh --help
```


### [Running the tool](#running-the-tool)

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
  --branch <branch name> (default: checked out branch)
  --out <output path for json file> (default: ./app/build/data.json)
```

**Note:** The app expects `data.json` to be present in the `app/build` directory (or `app/public` when `dev.sh` is run).

**Note:** If the parser and app are already built, the build is reused. To start fresh, run the `clean.sh` script prior to `start.sh` and `dev.sh`

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

### [Ignoring files](#ignoring-files)
Files or folders can be hidden by adding the name to the .truckignore file in the root of the project (each entry separated by newline), for example:

```
package-lock.json
yarn.lock
*.json
```

You can also ignore file-extensions by writing an asterix followed by the extension, for example:

```
*.md
```

### [Aggregating users](#aggregating-users)
If you have a user that goes under multiple aliases in git, you can add them together, by adding a *truckconfig.json* file to the root of the project to be analyzed.

An example could be:
```json
{
    "unionedAuthors": [
        ["Bob", "Bobby", "Bob The Cool"],
        ["Alice", "Alililili"]
      ]
}
```

In this case, all commits made by either Bob, Bobby or Bob The Cool will be credited to Bob. And commits by Alice and Alililili will be credited to Alice.

If a name is not in the truckconfig, then all names will be shown separately.

### [Development](#development)

To run the tool in development mode with hot reloading, run:

```
dev.sh <args>
```

It takes the same arguments as `start.sh`.


### [Logging](#logging)
To enable or disable loging output, set the LOG_LEVEL variable to any of the following values:
- SILENT
- ERROR
- WARN
- INFO
- DEBUG

This will disable the progress spinner and enable the given logging level. This can be done in the command line, or by adding a `.env` file in the root of the repository, for example:

```
LOG_LEVEL=DEBUG
```

The default log level is INFO.

To disable colored loging, set
```
COLOR=0
```
in `.env`

### [Only running the parser](#only-running-the-parser)

If you only want to run the parser directly, run:

```
parse.sh <args>
```

See [Running the tool](#running-the-tool) for information on arguments.
