import * as duckdb from "@duckdb/duckdb-wasm"
import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url"
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url"
import type { CommitDTO, DBFileChange, GitLogEntry, RawGitObject, RenameEntry, RenameInterval } from "./model"
import os from "os"
import { resolve } from "path"
import { Inserter } from "./DBInserter"
import { getTimeIntervals } from "./util.server"

export default class Git {
  private repoSanitized: string
  private branchSanitized: string
  public selectedRange: [number, number]

  constructor(
    private repo: string,
    private branch: string
  ) {
    this.repoSanitized = repo.replace(/\W/g, "_") + "_"
    this.branchSanitized = branch.replace(/\W/g, "_") + "_"
    this.selectedRange = [0, 1_000_000_000_000] as [number, number]
  }

  public async updateTimeInterval(timeSeriesStart: number, timeSeriesEnd: number) {
    const start = Number.isNaN(timeSeriesStart) ? 0 : timeSeriesStart
    const end = Number.isNaN(timeSeriesEnd) ? 1_000_000_000_000 : timeSeriesEnd
    this.selectedRange = [start, end]
    // TODO update views by calling initViews
    // await DB.initViews(await this.instance, start, end)
  }

  private getTimeStringFormat(timerange: [number, number]) {
    const durationDays = (timerange[1] - timerange[0]) / (60 * 60 * 24)
    if (durationDays < 150) return ["%a %-d %B %Y", "day"]
    if (durationDays < 1000) return ["Week %V %Y", "week"]
    if (durationDays < 4000) return ["%B %Y", "month"]
    return ["%Y", "year"]
  }
}
