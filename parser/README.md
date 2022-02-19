# Git Parser
Parses git objects

# How to run
In /parser folder, to install dependencies run
```
npm i
```

To display usage informaton, run
```
npm start -- --help
```


To run the parser on a repository
```
npm run start -- <args>

  --path <path to git repository> (default: current directory)
  --out <output path for json file> (default: ./.temp/{repo}_{branch}.json)
  --branch <branch name> (default: current branch)
```

For example, if run from the parser folder, `npm start --path ..` will analyze the git-visual repository and output the result to `.temp/git-visual_main.json`

To enable detalied loging output, set the LOG_LEVEL variable to any of these values: SILENT, ERROR, WARN, INFO, DEBUG. This can be done in the command line, or by adding a `.env` file, for example:

```
LOG_LEVEL=DEBUG
```

The default log level is INFO.
