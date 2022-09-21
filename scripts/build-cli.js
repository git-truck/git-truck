// eslint-disable-next-line @typescript-eslint/no-var-requires
require('esbuild').build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  outfile: 'build/cli.js',
  platform: "node",
  target: "node16"
})
.then(() => {
  console.log("Successfully built CLI");
})
.catch(() => process.exit(1))

