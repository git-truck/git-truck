import { startTransition, StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { RemixBrowser } from "@remix-run/react"

// function hydrate() {
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  )
})
// }

// if (window.requestIdleCallback) {
//   window.requestIdleCallback(hydrate);
// } else {
//   // Safari doesn't support requestIdleCallback
//   // https://caniuse.com/requestidlecallback
//   window.setTimeout(hydrate, 1);
// }
