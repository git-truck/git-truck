import { useFetcher } from "@remix-run/react"
import { HydratedGitBlobObject } from "~/analyzer/model"
import { Button } from "./util"
import { History } from "@styled-icons/material"

interface props {
  state: "idle" | "submitting" | "loading"
  clickedObject: HydratedGitBlobObject
}

export function FileHistoryFragment(props: props) {
  const fetcher = useFetcher();

  if (fetcher.state !== "idle") return <p>Loading file history...</p>

  if (!fetcher.data || !Array.isArray(fetcher.data[0]) || props.clickedObject.path !== fetcher.data[1]) {
    return (
      <fetcher.Form method="post" action={location.pathname}>
        <input type="hidden" name="history" value={props.clickedObject.path} />
        <Button
          type="submit"
          disabled={props.state !== "idle"}
          onClick={() => {
            // props.setFetchedPath(props.clickedObject.path)
            // isProcessingHideRef.current = true
          }}
        >
          <History display="inline-block" height="1rem" />
          Show file history
        </Button>
      </fetcher.Form>
    )
  }

  return (
    
    <>
      {fetcher.data[0].map((commit) => (
        <>
          <p>
            {commit.author} {commit.message}
          </p>
        </>
      ))}
    </>
  )



}
