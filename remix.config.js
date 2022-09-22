/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*", "components/*"],
  serverDependenciesToBundle: [
    "styled-components",
    "d3-hierarchy",
    "@react-aria/utils",
    "is-binary-path",
    "yargs-parser",
    "gitignore-parser",
    "latest-version",
    "package-json",
    "registry-url",
    "got",
    "p-cancelable",
    "form-data-encoder",
    "@sindresorhus/is",
    "@szmarczak/http-timer",
    "semver"
  ],
  appDirectory: "src"
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  // devServerPort: 8002
}
