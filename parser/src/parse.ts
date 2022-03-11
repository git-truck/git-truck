import fsSync, { promises as fs, readFileSync } from "fs"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  Person,
} from "./model"
import { log } from "./log"
import {
  describeAsyncJob,
  formatMs,
  writeRepoToFile,
  getCurrentBranch,
  getRepoName,
  deflateGitObject,
} from "./util"
import { emptyGitCommitHash } from "./constants"
import { join } from "path"
import TruckIgnore from "./TruckIgnore"
import { resolve } from "path"
import { performance } from "perf_hooks"
import yargsParser from "yargs-parser"
import { hydrateData } from "./hydrate"

export async function findBranchHead(repo: string, branch: string | null) {
  if (branch === null) branch = await getCurrentBranch(repo)

  const gitFolder = join(repo, ".git")
  if (!fsSync.existsSync(gitFolder)) {
    throw Error(`${repo} is not a git repository`)
  }
  // Find file containing the branch head
  const branchPath = join(gitFolder, "refs/heads/" + branch)
  const absolutePath = join(process.cwd(), branchPath)
  log.debug("Looking for branch head at " + absolutePath)

  const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
  log.debug(`${branch} -> [commit]${branchHead}`)

  return [branchHead, branch]
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

export async function parseCommit(
  repo: string,
  repoName: string,
  hash: string
): Promise<GitCommitObject> {
  const { tree, ...commit } = await parseCommitLight(repo, hash)
  const truckignore = new TruckIgnore(repo)
  return {
    ...commit,
    tree: await parseTree(getRepoName(repo), repo, repoName, tree, truckignore),
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

async function parseTree(
  path: string,
  repo: string,
  name: string,
  hash: string,
  truckignore: TruckIgnore
): Promise<GitTreeObject> {
  const rawContent = await deflateGitObject(repo, hash)
  const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

  const children: (GitTreeObject | GitBlobObject)[] = []
  for await (const line of entries) {
    const [, type, hash, name] = line.split(/\s+/)
    if (!truckignore.isAccepted(name)) continue
    const newPath = [path, name].join("/")
    log.debug(`Path: ${newPath}`)

    switch (type) {
      case "tree":
        children.push(await parseTree(newPath, repo, name, hash, truckignore))
        break
      case "blob":
        children.push(await parseBlob(newPath, repo, name, hash))
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

async function parseBlob(
  path: string,
  repo: string,
  name: string,
  hash: string
): Promise<GitBlobObject> {
  const content = await deflateGitObject(repo, hash)
  const blob: GitBlobObject = {
    type: "blob",
    hash,
    path,
    name,
    content,
  }
  return blob
}

interface truckConfigResponse {
  unionedAuthors: string[][]
}

export async function loadTruckConfig(repoDir: string) {
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

export async function parse(rawArgs: string[]) {
  const args = yargsParser(rawArgs, {
    configuration: {
      "duplicate-arguments-array": false,
    },
  })

  if (args.help || args.h) {
    console.log(`Git Visual

  Usage: ./start.sh <args> or ./dev.sh <args>

  Options:
    --path <path to git repository> (default: current directory)
    --branch <branch name> (default: checked out branch)
    --out <output path for json file> (default: ./app/build/data.json)
    --help, -h: Show this help message`)
    process.exit(1)
  }

  const repoDir = args.path ?? "."
  const branch = args.branch ?? null

  const start = performance.now()
  const [branchHead, branchName] = await describeAsyncJob(
    () => findBranchHead(repoDir, branch),
    "Finding branch head",
    "Found branch head",
    "Error finding branch head"
  )
  const repoName = getRepoName(repoDir)
  const outFileName = args.out ?? `./.temp/${repoName}_${branchName}.json`
  const repoTree = await describeAsyncJob(
    () => parseCommit(repoDir, repoName, branchHead),
    "Parsing commit tree",
    "Commit tree parsed",
    "Error parsing commit tree"
  )
  const hydratedRepoTree = await describeAsyncJob(
    () => hydrateData(repoDir, repoTree),
    "Hydrating commit tree with authorship data",
    "Commit tree hydrated",
    "Error hydrating commit tree"
  )
  const outPath = join(process.cwd(), outFileName)
  const authorUnions = await loadTruckConfig(repoDir)
  await describeAsyncJob(
    () =>
      writeRepoToFile(outPath, {
        repo: repoName,
        branch: branchName,
        commit: hydratedRepoTree,
        authorUnions: authorUnions,
      }),
    "Writing data to file",
    `Wrote data to ${resolve(outPath)}`,
    `Error writing data to file ${outFileName}`
  )
  const stop = performance.now()

  log.raw(`\nDone in ${formatMs(stop - start)}`)
}

export const exportForTest = {
  getCoAuthors,
}
