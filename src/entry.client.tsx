import { StrictMode } from "react"
import { hydrate } from "react-dom"
import { RemixBrowser } from "@remix-run/react";

hydrate(
  <StrictMode>
    <RemixBrowser />
  </StrictMode>,
  document
)
