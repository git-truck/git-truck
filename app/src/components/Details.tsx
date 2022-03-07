import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./Chart"
import { Box, BoxTitle, CloseButton } from "./util"
import { useOptions } from "../OptionsContext"
import { HydratedGitBlobObject } from "../../../parser/src/model"
import { dateFormat } from "../util"

export function Details() {
  const { setClickedBlob, clickedBlob } = useOptions()
  if (clickedBlob === null) return null
  return (
    <Box>
      <CloseButton
        onClick={() => {
          setClickedBlob(null)
        }}
      >
        &times;
      </CloseButton>
      <BoxTitle title={clickedBlob.name}>{clickedBlob.name}</BoxTitle>
      <>
        <strong>Path:</strong> {clickedBlob.path}
      </>
      <LineCountDiv lineCount={clickedBlob.noLines} />
      <div>
        <strong>Number of commits:</strong>{" "}
        {clickedBlob.noCommits > 0 ? clickedBlob.noCommits : 0}
      </div>
      <div>
        <strong>Last changed:</strong> {dateFormat(clickedBlob.lastChangeEpoch)}
      </div>
      <Spacer xl />
      <AuthorDistribution currentClickedBlob={clickedBlob} />
    </Box>
  )
}

function AuthorDistribution(props: {
  currentClickedBlob: HydratedGitBlobObject
}) {
  if (Object.values(props.currentClickedBlob.authors).length === 0) return <></>
  return (
    <>
      <div>
        <strong>Author distribution:</strong>
      </div>
      {Object.entries(
        makePercentResponsibilityDistribution(props.currentClickedBlob)
      )
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .map(([author, contrib]) => (
          <div key={`${author}${contrib}`}>
            <b>{author}:</b> {(contrib * 100).toFixed(2)}%
          </div>
        ))}
    </>
  )
}

function LineCountDiv(props: { lineCount: number }) {
  if (!props.lineCount) return <div>No lines (likely a binary file)</div>
  return (
    <div>
      <strong>Line count:</strong> {props.lineCount}
    </div>
  )
}
