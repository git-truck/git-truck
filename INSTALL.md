## [Get started](#get-started)

1. Within a git repository, or a directory containing git repositories, run the command `npx git-truck@latest`.
2. If it is your first time using git truck, press `y` followed by `enter` when it asks you to download the package.
  ![billede](https://user-images.githubusercontent.com/23435481/186969136-6f5dc706-454c-4f5c-a747-e31711fd08cb.png)
  
3. The application will now open in your default browser, while in your terminal, you can see the progress of analyzing your repository.

  ![billede](https://user-images.githubusercontent.com/23435481/186969232-c1ee1782-429d-4214-9502-2faa2bc10e9f.png)

4. Once the analyzation is complete, you will see your repository visualized in your browser.

# Manual installation
In case you do not wish to use NPM, you can do the following

1. Clone this repository to your machine
2. In the project folder, install dependencies by running `npm i`
3. In the root folder of the project run `npm start -- --path /path/to/repo` where the last argument, is the path to the repository you want to analyze.
