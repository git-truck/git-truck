import fsSync, { promises as fs, readFileSync } from "fs"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  Person,
} from "./model"
import { log } from "./log.server"
import {
  describeAsyncJob,
  formatMs,
  writeRepoToFile,
  getCurrentBranch,
  getRepoName,
  deflateGitObject,
} from "./util"
import { emptyGitCommitHash } from "./constants"
import { resolve , isAbsolute, join} from "path"
import TruckIgnore from "./TruckIgnore.server"
import { performance } from "perf_hooks"
import { hydrateData } from "./hydrate.server"

import { } from "@remix-run/node"

interface truckConfigResponse {
  unionedAuthors: string[][]
}

export class Parser {
  private truckignore: TruckIgnore
  constructor(private cwd: string, private repoDir: string, private branch: string, private outPath?: string) {
    this.truckignore = new TruckIgnore(repoDir)
  }

  async findBranchHead() {
    if (this.branch === null) this.branch = await getCurrentBranch(this.repoDir)

    const gitFolder = join(this.repoDir, ".git")
    if (!fsSync.existsSync(gitFolder)) {
      throw Error(`${this.repoDir} is not a git repository`)
    }
    // Find file containing the branch head
    const branchPath = join(gitFolder, "refs/heads/" + this.branch)
    const absolutePath = join(process.cwd(), branchPath)
    log.debug("Looking for branch head at " + absolutePath)

    const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
    log.debug(`${this.branch} -> [commit]${branchHead}`)

    return [branchHead, this.branch]
  }

  async parseFileTree(
    repoName: string,
    hash: string
  ): Promise<GitCommitObject> {
    const { tree, ...commit } = await parseCommitLight(this.repoDir, hash)
    return {
      ...commit,
      tree: await this.parseTree(repoName, repoName, tree),
    }
  }

  async parseTree(
    path: string,
    name: string,
    hash: string
  ): Promise<GitTreeObject> {
    const rawContent = await deflateGitObject(this.repoDir, hash)
    const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

    const children: (GitTreeObject | GitBlobObject)[] = []
    for await (const line of entries) {
      const catFileRegex = /^.+?\s(?<type>\w+)\s(?<hash>.+?)\s+(?<name>.+?)\s*$/g;
      const groups = catFileRegex.exec(line)?.groups ?? {}

      const type = groups["type"]
      const hash = groups["hash"]
      const name = groups["name"]

      if (!this.truckignore.isAccepted(name)) continue
      const newPath = [path, name].join("/")
      log.debug(`Path: ${newPath}`)

      switch (type) {
        case "tree":
          children.push(await this.parseTree(newPath, name, hash))
          break
        case "blob":
          children.push(await this.parseBlob(newPath, name, hash))
          break
        default:
          throw new Error(` type ${type}`)
      }
    }

    return {
      type: "tree",
      path: path,
      name,
      hash,
      children,
    }
  }

  async parseBlob(
    path: string,
    name: string,
    hash: string
  ): Promise<GitBlobObject> {
    const content = await deflateGitObject(this.repoDir, hash)
    const blob: GitBlobObject = {
      type: "blob",
      hash,
      path,
      name,
      content,
    }
    return blob
  }


  loadTruckConfig(repoDir: string) {
    try {
      const truckConfig = JSON.parse(
        readFileSync(join(repoDir, "truckconfig.json"), "utf-8")
      ) as truckConfigResponse
      return truckConfig.unionedAuthors
    } catch (e) {
      log.info("No truckignore found: " + e)
    }
    return []
  }

  public async parse() {
    const start = performance.now()
    const [branchHead, branchName] = await describeAsyncJob(
      () => this.findBranchHead(),
      "Finding branch head",
      "Found branch head",
      "Error finding branch head"
    )
    const repoName = getRepoName(this.repoDir)
    const repoTree = await describeAsyncJob(
      () => this.parseFileTree(repoName, branchHead),
      "Parsing commit tree",
      "Commit tree parsed",
      "Error parsing commit tree"
    )
    const hydratedRepoTree = await describeAsyncJob(
      () => hydrateData(this.repoDir, repoTree),
      "Hydrating commit tree with authorship data",
      "Commit tree hydrated",
      "Error hydrating commit tree"
    )

    const defaultOutPath = resolve(__dirname, "..", ".temp", repoName, `${branchName}.json`)
    let outPath = resolve(this.outPath ?? defaultOutPath)
    if (!isAbsolute(outPath))
      outPath = resolve(this.cwd, outPath)

    const authorUnions = this.loadTruckConfig(this.repoDir)
    const data = {
      repo: repoName,
      branch: branchName,
      commit: hydratedRepoTree,
      authorUnions: authorUnions,
    }
    await describeAsyncJob(
      () =>
        writeRepoToFile(outPath, data),
      "Writing data to file",
      `Wrote data to ${resolve(outPath)}`,
      `Error writing data to file ${outPath}`
    )
    const stop = performance.now()

    log.raw(`\nDone in ${formatMs(stop - start)}`)

    return data
  }
}

export async function parseCommitLight(
  repo: string,
  hash: string
): Promise<GitCommitObjectLight> {
  const rawContent = await deflateGitObject(repo, hash)
  const commitRegex =
    /tree (?<tree>.*)\n(?:parent (?<parent>.*)\n)?(?:parent (?<parent2>.*)\n)?author (?<authorName>.*) <(?<authorEmail>.*)> (?<authorTimeStamp>\d*) (?<authorTimeZone>.*)\ncommitter (?<committerName>.*) <(?<committerEmail>.*)> (?<committerTimeStamp>\d*) (?<committerTimeZone>.*)\n(?:gpgsig (?:.|\n)*-----END PGP SIGNATURE-----)?\s*(?<message>.*)\s*(?<description>(?:.|\s)*)/gm

  const match = commitRegex.exec(rawContent)
  const groups = match?.groups ?? {}

  const tree = groups["tree"]
  const parent = groups["parent"] ?? emptyGitCommitHash
  const parent2 = groups["parent2"] ?? null
  const author = {
    name: groups["authorName"],
    email: groups["authorEmail"],
    timestamp: Number(groups["authorTimeStamp"]),
    timezone: groups["authorTimeZone"],
  }
  const committer = {
    name: groups["committerName"],
    email: groups["committerEmail"],
    timestamp: Number(groups["committerTimeStamp"]),
    timezone: groups["committerTimeZone"],
  }
  const message = groups["message"]
  const description = groups["description"]
  const coauthors = description ? getCoAuthors(description) : []

  return {
    type: "commit",
    hash,
    tree,
    parent,
    parent2,
    author,
    committer,
    message,
    description,
    coauthors,
  }
}

function getCoAuthors(description: string) {
  const coauthorRegex = /.*Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  const coauthormatches = description.matchAll(coauthorRegex)
  let next = coauthormatches.next()
  const coauthors: Person[] = []

  while (next.value !== undefined) {
    coauthors.push({
      name: next.value.groups["name"].trimEnd(),
      email: next.value.groups["email"],
    })
    next = coauthormatches.next()
  }
  return coauthors
} 

export const exportForTest = {
  getCoAuthors
}
