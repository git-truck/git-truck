import { PassThrough } from "stream"
import type { EntryContext } from "@remix-run/node"
import { createReadableStreamFromReadable } from "@remix-run/node"
import { RemixServer } from "@remix-run/react"
import { renderToPipeableStream } from "react-dom/server"

export const streamTimeout = 10_000_000

export default handleBrowserRequest

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={streamTimeout} />,
      {
        onShellReady() {
          const body = new PassThrough()

          responseHeaders.set("Content-Type", "text/html")

          resolve(
            new Response(createReadableStreamFromReadable(body), {
              headers: responseHeaders,
              status: responseStatusCode
            })
          )

          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          console.error(error)
          responseStatusCode = 500
        }
      }
    )

    setTimeout(abort, streamTimeout)
  })
}
