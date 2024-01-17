/** @type {import('@remix-run/dev').AppConfig} */
export default {
  serverDependenciesToBundle: "all",
  appDirectory: "src",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: process.env.NODE_ENV === "production",
  browserNodeBuiltinsPolyfill: { modules: { url: true }}
}
