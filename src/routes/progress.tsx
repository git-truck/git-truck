import { analyzationStatus } from "~/analyzer/analyze.server"
import { progress, totalCommitCount } from "~/analyzer/hydrate.server"

export const loader = async () => {
  return { progress, totalCommitCount, analyzationStatus }
}
