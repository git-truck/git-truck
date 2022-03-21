import fsSync, { promises as fs, readFileSync } from "fs"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  Person,
} from "./model"
import { log, setLogLevel } from "./log.server"
import {
  describeAsyncJob,
  formatMs,
  writeRepoToFile,
  getCurrentBranch,
  getRepoName,
  deflateGitObject,
  getDefaultQuotePathValue,
  disableQuotePath,
  resetQuotePath,
} from "./util"
import { emptyGitCommitHash } from "./constants"
import { resolve , isAbsolute, join} from "path"
import { TruckIgnore } from "./model"
import { performance } from "perf_hooks"
import { hydrateData } from "./hydrate.server"
import yargs from 'yargs'

import { } from "@remix-run/node"
import { compile } from "gitignore-parser"

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
  hash: string,
  truckignore: TruckIgnore
): Promise<GitCommitObject> {
  const { tree, ...commit } = await parseCommitLight(repo, hash)
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
    const catFileRegex = /^.+?\s(?<type>\w+)\s(?<hash>.+?)\s+(?<name>.+?)\s*$/g;
    const groups = catFileRegex.exec(line)?.groups ?? {}

    const type = groups["type"]
    const hash = groups["hash"]
    const name = groups["name"]

    if (!truckignore.accepts(name)) continue
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

export async function parse() {
  const args = yargs.config({
    extends: './truckconfig.json',
  }).argv as {[key: string]: string | object}


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

  if (args.log) {
    setLogLevel(args.log as string)
  }

  const cwd = process.cwd()

  let repoDir = (args.path ?? ".") as string
  if (!isAbsolute(repoDir))
    repoDir = resolve(cwd, repoDir)

  const branch = args.branch as string ?? null

  const ignoredString = (args.ignoredFiles as string[] ?? []).toString().replace(/,/g, "\n")
  const truckignore = compile(ignoredString)

  const quotePathDefaultValue = await getDefaultQuotePathValue(repoDir)
  await disableQuotePath(repoDir)

  const start = performance.now()
  const [branchHead, branchName] = await describeAsyncJob(
    () => findBranchHead(repoDir, branch),
    "Finding branch head",
    "Found branch head",
    "Error finding branch head"
  )
  const repoName = getRepoName(repoDir)
  const repoTree = await describeAsyncJob(
    () => parseCommit(repoDir, repoName, branchHead, truckignore),
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

  const defaultOutPath = resolve(__dirname, "..", ".temp", repoName, `${branchName}.json`)
  let outPath = resolve(args.out as string ?? defaultOutPath)
  if (!isAbsolute(outPath))
    outPath = resolve(cwd, outPath)

  const authorUnions = args.unionedAuthors as string[][]
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

  await resetQuotePath(repoDir, quotePathDefaultValue)

  return data
}

export const exportForTest = {
  getCoAuthors,
}
