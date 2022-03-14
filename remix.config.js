/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: [".*"
  ,"components/*"
],
  serverDependenciesToBundle: [
    "styled-components",
    "d3-hierarchy",
    "@react-aria/utils"
  ]
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: "build/index.js",
  // publicPath: "/build/",
  // devServerPort: 8002
};
