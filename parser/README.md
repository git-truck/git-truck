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


To transpile the typescript and run the parser
```
npm start [path to git repository = .] [branch = main] [outFileName = ./.temp/{repo}_{branch}.json]
```

For example, if run in the parser folder, `npm start ..` will analyze the git-visual repository and output the result to `.temp/git-visual_main.json`



Then input the path to the git repo to be parsed (relative or absolute)

To enable debugLog output, set the NODE_DEBUG variable to any value. This can be done in the command line, or by adding a `.env` file, for example:

```
DEBUG=true
```

# Ignoring files
Files or folders can be hidden by adding the name to the .truckignore file in the root of the project (each entry separated by newline).
You can also ignore file-extensions by writing an asterix followed by the extension, for example:
> *.md
