/** @type {import('@remix-run/dev').AppConfig} */
export default {
  future: {
    v2_errorBoundary: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
  ignoredRouteFiles: ["**/.*", "components/*"],
  serverDependenciesToBundle: "all",
  tailwind: true,
  postcss: true,
  appDirectory: "src",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  serverMainFields: ["main", "module"],
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: false,
}
