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
  let timing = (performance.now() - start)
  const timingString = timing < 1000 ? `${timing.toFixed(1)}ms` : `${(timing / 1000).toFixed(1)}s`
  console.log(`Successfully built ${process.env.NODE_ENV || "production"} CLI in ${timingString}`)
})
.catch(() => process.exit(1))

