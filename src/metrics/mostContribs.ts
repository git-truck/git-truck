import type { GitBlobObject } from "~/analyzer/model"
import type { MetricCache } from "./metrics"
import { SpectrumTranslater } from "./metricUtils"
import { hslToHex } from "../util"
import { noEntryColor } from "~/const"

export class ContribAmountTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 40
  readonly max_lightness = 92

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): `#${string}` {
    return hslToHex(118, 50, this.translater.inverseTranslate(value))
  }

  setColor(blob: GitBlobObject, cache: MetricCache, contribCountPerFile: Record<string, number>) {
    const existing = contribCountPerFile[blob.path]
    const color = existing ? this.getColor(existing) : noEntryColor
    cache.colormap.set(blob.path, color)
  }
}
