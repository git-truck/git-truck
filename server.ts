import express from "express";
import compression from "compression";
import morgan from "morgan";
import open from "open";
import { createRequestHandler } from "@remix-run/express";
import { join } from "path";
import { readFileSync } from "fs";

import * as serverBuild from "@remix-run/dev/server-build";

const gitTruckPackage = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

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

function printOpen(port: number) {
  const serverport = port
  console.log(`Git Truck v${gitTruckPackage.version}`);
  console.log(`Serving static assets from ${staticAssetsPath}`);
  if (serverport !== port) console.log("Default/Specified port was used by another process");
  console.log(`Express server listening on port ${serverport}`);
  open("http://localhost:" + serverport);
}

function startServer(port: number) {
  let server = app.listen(port)
    .on('error', () => {
      server.close(() => {
        startServer(port + 1);
      })
    })
    .once('listening', () => printOpen(port));
}

startServer(Number(port));
