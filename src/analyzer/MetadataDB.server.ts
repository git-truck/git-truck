import { resolve } from "path"
import os from "os"
import { promises as fs } from "fs"
import type { CompletedResult } from "~/shared/model"

type MetadataCompletion = {
  hash: string
  time: number
}

interface MetadataJson {
  completions: Record<string, MetadataCompletion>
  authorcolors: Record<string, string>
}

export default class MetadataDB {
  private path = resolve(os.tmpdir(), "git-truck-cache", "metadata.json")
  private separator = "---"

  async readMetadata(): Promise<MetadataJson> {
    try {
      const data = JSON.parse(await fs.readFile(this.path, "utf8")) as MetadataJson
      return data
    } catch {
      return { completions: {}, authorcolors: {} }
    }
  }

  async setMetadata(newData: MetadataJson) {
    const asString = JSON.stringify(newData)
    await fs.writeFile(this.path, asString, "utf8")
  }

  public async setCompletion(
    { repositoryPath, branch }: { repositoryPath: string; branch: string },
    /**
     * The latest commit hash of the analyzed repository
     */
    hash: string
  ) {
    const currentMetadata = await this.readMetadata()
    currentMetadata.completions[this.getCompletionKey({ repositoryPath, branch })] = {
      hash: hash,
      time: Math.floor(Date.now() / 1000)
    }
    await this.setMetadata(currentMetadata)
  }

  public async addAuthorColor(author: string, color: string) {
    const currentMetadata = await this.readMetadata()
    if (color === "") delete currentMetadata.authorcolors[author]
    else currentMetadata.authorcolors[author] = color
    await this.setMetadata(currentMetadata)
  }

  public async getAuthorColors() {
    const currentMetadata = await this.readMetadata()
    return currentMetadata.authorcolors as Record<string, `#${string}`>
  }

  public async getLastRun({
    repositoryPath,
    branch
  }: {
    repositoryPath: string
    branch: string
  }): Promise<MetadataCompletion | undefined> {
    const currentMetadata = await this.readMetadata()
    return currentMetadata.completions[this.getCompletionKey({ repositoryPath, branch })]
  }

  public async getCompletedRepos() {
    const completedResults: CompletedResult[] = []
    const currentMetadata = await this.readMetadata()
    for (const [key, val] of Object.entries(currentMetadata.completions)) {
      const [repo, branch] = key.split(this.separator)
      completedResults.push({ repo, branch, time: val.time, hash: val.hash })
    }
    return completedResults
  }

  getCompletionKey({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    return `${repositoryPath}${this.separator}${branch}`
  }
}
