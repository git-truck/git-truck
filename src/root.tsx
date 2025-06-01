import * as konami from "react-konami-code"
import type { MetaFunction } from "@remix-run/node"
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "@remix-run/react"

import "~/styles/vars.css"
import { Code } from "./components/util"
import "~/tailwind.css"
import { ThemeProvider, cn, usePrefersLightMode } from "./styling"
import "react-datepicker/dist/react-datepicker.css"

export const meta: MetaFunction = () => {
  return [{ title: "Git Truck" }]
}

const { useKonami } = konami()

export default function App() {
  console.log(typeof useKonami)
  console.log(typeof konami)
  useKonami(() => window.open("https://fruit-rush.joglr.dev", "_self"))

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <ThemeProvider>
        <Body>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
        </Body>
      </ThemeProvider>
    </html>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  const prefersLightMode = usePrefersLightMode()
  return (
    <body
      className={cn("bg-gray-200 text-gray-700 dark:bg-gray-900 dark:text-gray-300", {
        dark: !prefersLightMode
      })}
    >
      {children}
    </body>
  )
}

export const ErrorBoundary = () => {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <html lang="en">
        <head>
          <title>Oops! An error wasn&apos;t handled</title>
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
      <html lang="en">
        <head>
          <title>Oops! An error wasn&apos;t handled</title>
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
