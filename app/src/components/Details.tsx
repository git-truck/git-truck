import { HydratedGitBlobObject } from "../../../parser/src/model"
import { Spacer } from "./Spacer"
import { makePercentResponsibilityDistribution } from "./BubbleChart"
import { Box } from "./Box"

export function Details({ currentBlob }: DetailsProps) {
  if (currentBlob === null) return null
  return (
    <Box className="file-details" title={currentBlob.name}>
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
interface DetailsProps {
  currentBlob: HydratedGitBlobObject | null
}
