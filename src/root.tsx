import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  createContext,
  isRouteErrorResponse,
  useLocation,
  useRouteError
} from "react-router"

import "~/styles/vars.css"
import { Code } from "./components/util"
import "~/tailwind.css"
import { cn } from "./styling"
import "react-datepicker/dist/react-datepicker.css"
import { ClearCacheForm } from "./routes/clear-cache"
import { LoadingIndicator } from "./components/LoadingIndicator"
import type { Route } from "./+types/root"
import { getLatestVersion } from "./shared/util.server"
import pkg from "../package.json" with { type: "json" }

export const versionContext = createContext<{
  installedVersion: string
  latestVersion: string | null
}>()

const rootMiddleware: Route.MiddlewareFunction = async ({ request, context }) => {
  context.set(versionContext, {
    installedVersion: pkg.version,
    latestVersion: await getLatestVersion()
  })
}

export const middleware: Route.MiddlewareFunction[] = [rootMiddleware]

export const meta = () => {
  return [{ title: "Git Truck" }]
}

export default function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  )
}

function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // const prefersLightMode = usePrefersLightMode()
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {/* <script
          dangerouslySetInnerHTML={{
            __html: `
              document.documentElement.classList.toggle(
                "dark",
                localStorage.${themeLocalStorageKey} === "DARK" || (!("${themeLocalStorageKey}" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches));
              `
          }}
        ></script> */}
      </head>
      <body
        className={cn(
          "bg-primary-bg dark:bg-primary-bg-dark text-primary-text dark:text-primary-text-dark",
          // { dark: !prefersLightMode },
          className
        )}
      >
        {children}
      </body>
      <ScrollRestoration />
      <Scripts />
    </html>
  )
}

export const ErrorBoundary = () => {
  const { pathname } = useLocation()
  const error = useRouteError()

  const errorMessage = isRouteErrorResponse(error)
    ? error.data.message
    : error instanceof Error
      ? error.message
      : "An unknown error occurred"

  return (
    <Shell className="bg-red-200">
      <div className="app-container">
        <div />
        <div className="card my-2">
          <h1 className="">Oh no, the Git Truck crashed!</h1>
          <p>See console for more infomation.</p>
          <Code>{errorMessage}</Code>
          <div>
            <ClearCacheForm redirectPath={pathname} />
          </div>
          <div className="flex justify-end gap-2">
            <Link className="btn" to={pathname}>
              Retry
            </Link>
            <Link className="btn btn--primary" to="..">
              Go back
            </Link>
          </div>
        </div>
        <LoadingIndicator />
      </div>
    </Shell>
  )
}
