import type { GitBlobObject } from "~/shared/model"
import type { MetricCache } from "./metrics"
import { SpectrumTranslater } from "./metricUtils"
import { hslToHex, rgbToHex } from "../shared/util"
import { noEntryColor } from "~/const"
import { interpolateCividis, interpolateCool, interpolateInferno, interpolateTurbo, scaleSequential } from "d3"

export class ContribAmountTranslater {
  readonly translater: SpectrumTranslater
  readonly min_lightness = 40
  readonly max_lightness = 92

  constructor(min: number, max: number) {
    this.translater = new SpectrumTranslater(min, max, this.min_lightness, this.max_lightness)
  }

  getColor(value: number): `#${string}` {
    // return hslToHex(118, 50, this.translater.inverseTranslate(value))

    const scale = scaleSequential(interpolateCool)
    return rgbToHex(scale(this.translater.inverseTranslate(value - 1) / 100) as `#${string}`)
  }

  setColor(blob: GitBlobObject, cache: MetricCache, contribCountPerFile: Record<string, number>) {
    const existing = contribCountPerFile[blob.path]
    const color = existing ? this.getColor(existing) : noEntryColor
    cache.colormap.set(blob.path, color)
  }
}
