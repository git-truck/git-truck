import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { MetricCache } from "./metrics"
import { SpectrumTranslater } from "./metricUtils"
import { hslToHex } from "../util"

export class CommitAmountTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 50
  readonly max_lightness = 95

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(20, 100, this.translater.inverseTranslate(value))
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    if (typeof blob.noCommits === "undefined") return
    cache.colormap.set(blob.path, this.getColor(blob.noCommits))
  }
}
