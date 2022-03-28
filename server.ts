import express from "express";
import compression from "compression";
import morgan from "morgan";
import open from "open";
import { createRequestHandler } from "@remix-run/express";
import { join } from "path";
import * as serverBuild from "@remix-run/dev/server-build";
import pkg from "./package.json"
import latestVersion from "latest-version"
import semverCompare from "semver-compare"

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

const staticAssetsPath = join(__dirname, "../public/build");
// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static(staticAssetsPath, { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static(staticAssetsPath, { maxAge: "1h" }));

app.use(morgan("tiny"));

app.all(
  "*",
  createRequestHandler({
    build: serverBuild,
    mode: process.env.NODE_ENV,
  })
);

const port = process.env.PORT || 3000;

async function printOpen(port: number) {
  const latestV = await latestVersion(pkg.name)
  const currentV = pkg.version

  if (semverCompare(latestV, currentV) === 1) {
    console.log(`Update available: ${latestV}. Currently installed: ${currentV}`);
    console.log(`To update, run: npx git-truck@latest`)
    console.log(`Or to install globally: npm install -g git-truck@latest`)
  }

  const serverport = port
  if (serverport !== port) console.log("Default/Specified port was used by another process");
  console.log(`Now listening on port ${serverport}`);
  open("http://localhost:" + serverport);
}

function startServer(port: number) {
  const server = app.listen(port)
    .on('error', () => {
      server.close(() => {
        startServer(port + 1);
      })
    })
    .once('listening', () => printOpen(port));
}

startServer(Number(port));
