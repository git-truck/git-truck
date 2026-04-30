import { dirname, resolve } from "path"
import os from "os"
import { promises as fs } from "fs"
import type { CompletedResult } from "~/shared/model"
import { DisposableMutex } from "~/server/DisposableMutex"

type MetadataCompletion = {
  hash: string
  time: number
}

type MetadataJson = {
  completions: Record<string, MetadataCompletion>
  authorcolors: Record<string, string>
}

export default class MetadataDB {
  private static separator = "---"
  private static metadataDB: MetadataDB
  private static mutex = new DisposableMutex()

  public static getPath() {
    return resolve(os.tmpdir(), "git-truck-cache", "metadata.json")
  }

  public static getInstance(): MetadataDB {
    if (!this.metadataDB) this.metadataDB = new MetadataDB()
    return this.metadataDB
  }

  public static async resetInstance() {
    using _ = await MetadataDB.mutex.withDisposable()
    await fs.rm(this.getPath(), { recursive: true, force: true })
    MetadataDB.metadataDB = new MetadataDB()
  }

  async readMetadata(): Promise<MetadataJson> {
    using _ = await MetadataDB.mutex.withDisposable()
    return await this.readMetadataUnlocked()
  }

  private async readMetadataUnlocked(): Promise<MetadataJson> {
    try {
      const data = JSON.parse(await fs.readFile(MetadataDB.getPath(), "utf8")) as MetadataJson
      return data
    } catch {
      return { completions: {}, authorcolors: {} }
    }
  }

  private async setMetadataUnlocked(newData: MetadataJson) {
    const asString = JSON.stringify(newData)
    await fs.mkdir(dirname(MetadataDB.getPath()), { recursive: true })
    await fs.writeFile(MetadataDB.getPath(), asString, "utf8")
  }

  public async setCompletion(
    {
      repositoryPath,
      branch
    }: {
      repositoryPath: string
      branch: string
    },
    /**
     * The latest commit hash of the analyzed repository
     */
    hash: string
  ) {
    using _ = await MetadataDB.mutex.withDisposable()
    await this.setCompletionUnlocked({ repositoryPath, branch }, hash)
  }

  private async setCompletionUnlocked(
    { repositoryPath, branch }: { repositoryPath: string; branch: string },
    /**
     * The latest commit hash of the analyzed repository
     */
    hash: string
  ) {
    const currentMetadata = await this.readMetadataUnlocked()
    currentMetadata.completions[MetadataDB.getCompletionKey({ repositoryPath, branch })] = {
      hash: hash,
      time: Math.floor(Date.now() / 1000)
    }
    await this.setMetadataUnlocked(currentMetadata)
  }

  public async addContributorColor(contributor: string, color: string) {
    using _ = await MetadataDB.mutex.withDisposable()
    await this.addContributorColorUnlocked(contributor, color)
  }

  private async addContributorColorUnlocked(contributor: string, color: string) {
    const currentMetadata = await this.readMetadataUnlocked()
    if (color === "") delete currentMetadata.authorcolors[contributor]
    else currentMetadata.authorcolors[contributor] = color
    await this.setMetadataUnlocked(currentMetadata)
  }

  public async getContributorColors() {
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
    return currentMetadata.completions[MetadataDB.getCompletionKey({ repositoryPath, branch })]
  }

  public async getCompletedRepos() {
    const completedResults: CompletedResult[] = []
    const currentMetadata = await this.readMetadata()
    for (const [key, val] of Object.entries(currentMetadata.completions)) {
      const [repositoryPath, branch] = key.split(MetadataDB.separator)
      completedResults.push({ repositoryPath, branch, time: val.time, hash: val.hash })
    }
    return completedResults
  }

  private static getCompletionKey({ repositoryPath, branch }: { repositoryPath: string; branch: string }) {
    return `${repositoryPath}${MetadataDB.separator}${branch}`
  }
}
