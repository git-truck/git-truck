/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')
const { build } = require('esbuild')

const start = performance.now()

build({
  entryPoints: ['./src/cli.ts'],
  bundle: true,
  outfile: 'cli.js',
  platform: "node",
  target: "node16"
})
.then(() => {
  // Append shebang
  const data = fs.readFileSync('cli.js')
  fs.writeFileSync('cli.js', '#!/usr/bin/env node\n' + data)

  let timing = (performance.now() - start)
  const timingString = timing < 1000 ? `${timing.toFixed(1)}ms` : `${(timing / 1000).toFixed(1)}s`
  console.log(`Successfully built ${process.env.NODE_ENV || "production"} CLI in ${timingString}`)
})
.catch(() => process.exit(1))

