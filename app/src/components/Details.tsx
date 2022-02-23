import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./BubbleChart"
import { Box, BoxTitle } from "./util"
import { useStore } from "../StoreContext"

export function Details() {
  const { currentBlob } = useStore()
  if (currentBlob === null) return null
  return (
    <Box>
      <BoxTitle>{currentBlob.name}</BoxTitle>
      <div>Line count: {currentBlob.noLines}</div>
      <Spacer xl />
      <div>Author distribution:</div>
      {Object.entries(makePercentResponsibilityDistribution(currentBlob))
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .map(([author, contrib]) => (
          <div key={`${author}${contrib}`}>
            <b>{author}:</b> {(contrib * 100).toFixed(2)}%
          </div>
        ))}
    </Box>
  )
}
