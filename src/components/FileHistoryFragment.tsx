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
  if (props.fetcher.state !== "idle") return <p>Loading file history...</p>

  if (!props.fetcher.data || !Array.isArray(props.fetcher.data[0]) || props.clickedObject.path !== props.fetcher.data[1]) {
    return (
      <props.fetcher.Form method="post" action={location.pathname}>
        <input type="hidden" name="history" value={props.clickedObject.path} />
        <Button
          type="submit"
          disabled={props.state !== "idle"}
          onClick={() => {
            // props.setFetchedPath(props.clickedObject.path)
            // isProcessingHideRef.current = true
          }}
        >
          Show file history
        </Button>
      </props.fetcher.Form>
    )

  }

  return (
    
    <>
      {props.fetcher.data[0].map((commit) => (
        <>
          <p>
            {commit.author} {commit.message}
          </p>
        </>
      ))}
    </>
  )



}
