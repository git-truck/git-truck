import { useKonami } from "react-konami-code"
import type { MetaFunction } from "@remix-run/node"
import type { ErrorBoundaryComponent } from "@remix-run/node"
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useCatch } from "@remix-run/react"

import appStyles from "~/styles/App.css"
import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import chartStyles from "~/styles/Chart.css"
import { useEffect } from "react"
import { Code } from "./components/util"
import tailwindStylesheet from "~/tailwind.css"

export const meta: MetaFunction = () => {
  return { title: "Git Truck" }
}

export function links() {
  return [
    ...[appStyles, varsStyles, indexStyles, chartStyles, tailwindStylesheet].map((x) => ({
      rel: "stylesheet",
      href: x,
    })),
    {
      rel: "favicon",
      type: "image/x-icon",
      href: "favicon.ico",
    },
  ]
}

export default function App() {
  useKonami(() => window.open("https://fruit-rush.joglr.dev", "_self"))

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="text-gray-600">
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
