import { analyzationStatus } from "~/analyzer/analyze.server"
import { progress, totalCommitCount } from "~/analyzer/hydrate.server"
import { sleep } from "~/analyzer/util.server"

let latestProgress = -1
let latestStatus = ""

export const loader = async () => {
  while (latestProgress === progress && latestStatus === analyzationStatus) {
    await sleep(100)
  }

  latestProgress = progress
  latestStatus = analyzationStatus
  return { progress, totalCommitCount, analyzationStatus }
}
