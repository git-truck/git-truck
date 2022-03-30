import { Form, useTransition } from "remix"
import { useData } from "../contexts/DataContext"
import { usePath } from "../contexts/PathContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle } from "./util"

export function GlobalInfo() {
  const data = useData()
  const { path, setPath } = usePath()
  const transitionState = useTransition()

  let temppath = path
  let paths: [string, string][] = []

  for (let i = 0; i < 3; i++) {
    if (temppath === "") { break; }
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx + 1), temppath])
    temppath = temppath.substring(0, idx)
  }
  if (temppath !== "") {
    paths = paths.slice(0, paths.length - 1);
    paths.push(["...", ""]);
    paths.push([data.repo, data.repo])
  }

  return (
    <Box>
      <BoxTitle>{data.repo}</BoxTitle>
      {(typeof data.cached === "undefined" || data.cached) ? <>
        (cached) <Form method="post" action="/repo">
          <input type="hidden" name="refresh" value="true" />
          <button disabled={transitionState.state !== "idle"}>{!transitionState.submission?.formData.has("refresh") ? "Run analyzer" : "Analyzing..."}</button>
        </Form>
      </> : null}
      <Spacer />
      <div>
        <strong>Branch: </strong>
        {data.branch}
      </div>
    </Box>
  )
}
