import { ErrorBoundaryComponent, Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useCatch } from "remix"
import type { MetaFunction } from "remix"

import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"
import { useEffect } from "react"
import { Code } from "./components/util"

export const meta: MetaFunction = () => {
  return { title: "Git Truck 🚛" }
}

export function links() {
  return [appStyles, varsStyles, indexStyles, chartStyles].map((x) => ({
    rel: "stylesheet",
    href: x,
  }))
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {typeof document === "undefined" ? "__STYLES__" : null}
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export function CatchBoundary() {
  const caught = useCatch()

  return (
    <html>
      <head>
        <title>Oops! An error wasn't handled</title>
        <Meta />
        <Links />
      </head>
      <body>
        <h1>
          {caught.status} {caught.statusText}
        </h1>
        <Scripts />
      </body>
    </html>
  )
}

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  useEffect(() => {
    console.error(error.message)
  }, [error])

  return (
    <html>
      <head>
        <title>Oops! An error wasn't handled</title>
        <Meta />
        <Links />
      </head>
      <body>
        <h1>{error.message}</h1>
        <Code>{error.stack}</Code>
        <Scripts />
      </body>
    </html>
  )
}
