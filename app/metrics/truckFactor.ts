import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { MetricCache } from "./metrics"
import { hslToHex } from "~/util"

export class TruckFactorTranslater {
  private readonly min_lightness = 50
  private readonly max_lighness = 90
  private readonly step: number

  constructor(author_count: number) {
    this.step =
      author_count <= 1
        ? 1
        : (this.step = (this.max_lighness - this.min_lightness) / Math.floor(Math.log2(author_count)))
  }

  getColor(value: number): `#${string}` {
    const level = Math.floor(Math.log2(value))
    const lightness = this.min_lightness + level * this.step
    const hue = 0
    const saturation = 75

    return hslToHex(hue, saturation, lightness)
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(Object.entries(blob.unionedAuthors?.HISTORICAL ?? []).length))
  }
}
