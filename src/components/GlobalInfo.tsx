import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRotate } from "@fortawesome/free-solid-svg-icons"
import { Form, useTransition } from "remix"
import { dateTimeFormatShort } from "~/util"
import { useData } from "../contexts/DataContext"
import { usePath } from "../contexts/PathContext"
import { Spacer } from "./Spacer"
import { Box, BoxTitle, InlineCode, TextButton } from "./util"

export function GlobalInfo() {
  const data = useData()
  const { path } = usePath()
  const transitionState = useTransition()

  let temppath = path
  let paths: [string, string][] = []

  for (let i = 0; i < 3; i++) {
    if (temppath === "") {
      break
    }
    const idx = temppath.lastIndexOf("/")
    paths.push([temppath.substring(idx + 1), temppath])
    temppath = temppath.substring(0, idx)
  }
  if (temppath !== "") {
    paths = paths.slice(0, paths.length - 1)
    paths.push(["...", ""])
    paths.push([data.repo, data.repo])
  }

  return (
    <Box>
      <BoxTitle>{data.repo}</BoxTitle>
      <Spacer />
      <div>
        <strong>Branch: </strong>
        {data.branch}
        <Spacer />
        <strong>Analyzed: </strong>
        {dateTimeFormatShort(data.lastRunEpoch)}
        <Spacer />
        <strong>As of commit: </strong>
        <InlineCode title={data.commit.message ?? "No commit message"}>{data.commit.hash.slice(0, 7)}</InlineCode>
      </div>
      <Spacer />
      <Form method="post" action="/repo">
        <input type="hidden" name="refresh" value="true" />
        <TextButton disabled={transitionState.state !== "idle"}>
          <FontAwesomeIcon icon={faRotate} />{" "}
          {!transitionState.submission?.formData.has("refresh") ? "Rerun analyzer" : "Analyzing..."}
        </TextButton>
      </Form>
    </Box>
  )
}
