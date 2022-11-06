import { FetcherWithComponents } from "@remix-run/react"
import { HydratedGitBlobObject } from "~/analyzer/model"
import { Button } from "./util"

interface props {
  fetcher: FetcherWithComponents<unknown>
  isBlob: boolean
  fetchedPath: string
  setFetchedPath: (value: React.SetStateAction<string>) => void
  state: "idle" | "submitting" | "loading"
  clickedObject: HydratedGitBlobObject
}

export function FileHistoryFragment(props: props) {
  if (Array.isArray(props.fetcher.data) && props.clickedObject.path == props.fetchedPath) {
    return (
        <>
          {props.fetcher.data.map((commit) => (
            <>
              <p>
                {commit.author} {commit.message}
              </p>
            </>
          ))}
        </>
    )
  }

  return (
    <props.fetcher.Form method="post" action={location.pathname}>
        <input type="hidden" name="history" value={props.clickedObject.path} />
        <Button
          type="submit"
          disabled={props.state !== "idle"}
          onClick={() => {
            props.setFetchedPath(props.clickedObject.path)
            // isProcessingHideRef.current = true
          }}
        >
          Show file history
        </Button>
      </props.fetcher.Form>
  )
}
