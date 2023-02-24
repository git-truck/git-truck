/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  future: {
    unstable_tailwind: true,
    unstable_postcss: true
  },
  ignoredRouteFiles: ["**/.*", "components/*"],
  serverDependenciesToBundle: process.env.NODE_ENV === "development" ? [
    "styled-components",
    "d3-hierarchy",
    "@react-aria/utils",
    "is-binary-path",
    "yargs-parser",
    "latest-version",
    "gitignore-parser",
    "latest-version",
    "package-json",
    "registry-url"
  ] : [
    /.*/
  ],
  appDirectory: "src"
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  // devServerPort: 8002
}
