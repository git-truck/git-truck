import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./BubbleChart"
import { Box, BoxTitle } from "./util"
import { useStore } from "../StoreContext"

export function Details() {
  const { currentClickedBlob } = useStore()
  if (currentClickedBlob === null) return null
  return (
    <Box>
      <BoxTitle>{currentClickedBlob.name}</BoxTitle>
      <div>Line count: {currentClickedBlob.noLines}</div>
      <Spacer xl />
      <div>Author distribution:</div>
      {Object.entries(makePercentResponsibilityDistribution(currentClickedBlob))
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .map(([author, contrib]) => (
          <div key={`${author}${contrib}`}>
            <b>{author}:</b> {(contrib * 100).toFixed(2)}%
          </div>
        ))}
    </Box>
  )
}
