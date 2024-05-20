/** @type {import('@remix-run/dev').AppConfig} */
export default {
  serverDependenciesToBundle: [/^(?:(?!duckdb|mock-aws-s3|nock).)*$/],
  appDirectory: "src",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: process.env.NODE_ENV === "production",
  browserNodeBuiltinsPolyfill: {
    modules: {
      path: true,
      crypto: true
    }
  }
}
