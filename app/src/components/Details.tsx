import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./Chart"
import { Box, BoxTitle, CloseButton } from "./util"
import { useStore } from "../StoreContext"
import { HydratedGitBlobObject } from "../../../parser/src/model"

export function Details() {
  const { setClickedBlob, clickedBlob } = useStore()
  if (clickedBlob === null) return null
  return (
    <Box>
      <BoxTitle>
        {clickedBlob.name}
        <CloseButton
          onClick={() => {setClickedBlob(null)}}
        >
          &times;
        </CloseButton>
      </BoxTitle>
      <LineCountDiv lineCount={clickedBlob.noLines} />
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
      <div>Author distribution:</div>
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
  return <div>Line count: {props.lineCount}</div>
}

