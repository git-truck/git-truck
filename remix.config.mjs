/** @type {import('@remix-run/dev').AppConfig} */
export default {
  serverDependenciesToBundle: [/^(?:(?!aws-sdk|mock-aws-s3|nock).)*$/],
  appDirectory: "src",
  serverBuildPath: "build/index.js",
  serverModuleFormat: "cjs",
  serverPlatform: "node",
  serverMinify: process.env.NODE_ENV === "production"
}
