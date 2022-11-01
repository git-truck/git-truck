import type { HydratedGitBlobObject } from "~/analyzer/model"
import type { MetricCache } from "./metrics"

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

  getColor(value: number) {
    const level = Math.floor(Math.log2(value))
    return `hsl(0,75%,${this.min_lightness + level * this.step}%)`
  }

  setColor(blob: HydratedGitBlobObject, cache: MetricCache) {
    cache.colormap.set(blob.path, this.getColor(Object.entries(blob.unionedAuthors?.HISTORICAL ?? []).length))
  }
}
