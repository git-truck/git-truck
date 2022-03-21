import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "remix";
import type { MetaFunction } from "remix";
import { getSearchbarID } from "./components/util";

export const meta: MetaFunction = () => {
  return { title: "Git Truck 🚛" };
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {typeof document === "undefined"
          ? "__STYLES__"
          : null}
      </head>
      <body 
        onKeyDown={(event) => {
          if (event.keyCode === 114 || (event.ctrlKey && event.keyCode === 70)) {
            event.preventDefault()
            document.getElementById(getSearchbarID())?.focus()
          }
        }}
        >
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
