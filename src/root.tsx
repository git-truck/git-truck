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

import "react-datepicker/dist/react-datepicker.css"
import "~/tailwind.css"
import pkg from "../package.json" with { type: "json" }
import type { Route } from "./+types/root"
import { Code } from "./components/util"
import { ClearCacheForm } from "./routes/clear-cache"
import { cn } from "./styling"
import { getLatestVersion } from "./shared/util.server"
import truck from "./assets/truck.png"
import { NuqsAdapter } from "nuqs/adapters/react-router/v7"

export const meta = () => {
  return [{ title: "Git Truck" }]
}

export default function App() {
  return (
    <NuqsAdapter>
      <Shell>
        <Outlet />
      </Shell>
    </NuqsAdapter>
  )
}

export const versionContext = createContext<{
  installedVersion: string
  latestVersion: string | null
}>()

const versionMiddleware: Route.MiddlewareFunction = async ({ context }) => {
  context.set(versionContext, {
    installedVersion: pkg.version,
    latestVersion: await getLatestVersion()
  })
}

export const middleware: Route.MiddlewareFunction[] = [versionMiddleware]

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
        {/* TODO: Show breadcrumb and GT info on all pages */}
        {/* Challenge: We want children to be able to render into both the top bar into the main content area */}
        {/* <Breadcrumb /> */}
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export const ErrorBoundary = () => {
  const { pathname, search } = useLocation()
  const error = useRouteError()

  const errorMessage = isRouteErrorResponse(error)
    ? error.data.message
    : error instanceof Error
      ? error.message
      : "An unknown error occurred"

  return (
    <Shell>
      <div className="app-container">
        <div />
        <div className="grid h-full w-full place-items-center px-4 py-10">
          <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
            <img src={truck} alt="Git Truck" className="w-full max-w-sm min-w-0" />
            <div className="text-4xl leading-tight font-extrabold">Oh no, the Git Truck crashed!</div>
            <p className="text-lg opacity-80">See console for more information.</p>
            <Code>{errorMessage}</Code>
            <ClearCacheForm redirectPath={pathname + search} />
            <div className="flex flex-wrap justify-center gap-2">
              <Link className="btn" to={pathname + search}>
                Retry
              </Link>
              <Link className="btn btn--primary" to="..">
                Go back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
