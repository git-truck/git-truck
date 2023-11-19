import { useKonami } from "react-konami-code"
import type { MetaFunction } from "@remix-run/node"
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError
} from "@remix-run/react"

import varsStyles from "~/styles/vars.css"
import indexStyles from "~/styles/index.css"
import { Code } from "./components/util"
import tailwindStylesheet from "~/tailwind.css"

export const meta: MetaFunction = () => {
  return [{ title: "Git Truck" }]
}

export function links() {
  return [
    ...[varsStyles, indexStyles, tailwindStylesheet].map((x) => ({
      rel: "stylesheet",
      href: x
    })),
    {
      rel: "favicon",
      type: "image/x-icon",
      href: "favicon.ico"
    },
    {
      rel: "preconnect",
      href: "https://fonts.googleapis.com"
    },
    {
      rel: "preconnect",
      href: "https://fonts.gstatic.com"
    },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Roboto+Mono:wght@400;700&display=swap"
    }
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

export const ErrorBoundary = () => {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <html>
        <head>
          <title>Oops! An error wasn't handled</title>
          <Meta />
          <Links />
        </head>
        <body>
          <h1>Error: {error.status}</h1>
          <Code>{error.data.message}</Code>
          <Scripts />
        </body>
      </html>
    )
  } else if (error instanceof Error) {
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
  } else {
    return null
  }
}
