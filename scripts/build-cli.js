const start = performance.now()
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('esbuild').build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  outfile: 'build/cli.js',
  platform: "node",
  target: "node16"
})
.then(() => {
  const timing = ((performance.now() - start) / 1000).toFixed(1)
  console.log(`Successfully built CLI in ${timing}s`)
})
.catch(() => process.exit(1))

