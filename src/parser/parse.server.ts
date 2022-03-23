import fsSync, { promises as fs } from "fs"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  ParserData,
  ParserDataInterfaceVersion,
  Person,
  TruckConfig,
  TruckUserConfig,
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
import { performance } from "perf_hooks"
import { hydrateData } from "./hydrate.server"
import yargs from 'yargs'

import { } from "@remix-run/node"
import ignore, { Ignore } from "ignore"

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
  truckignore: Ignore
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
  truckignore: Ignore
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

    if (truckignore.ignores(name)) continue
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

export async function updateTruckConfig(repoDir: string, updaterFn: (tc: TruckConfig) => TruckConfig) {
  const truckConfigPath = resolve(repoDir, "truckconfig.json")
  const currentConfig = JSON.parse(await fs.readFile(truckConfigPath, "utf-8")) as TruckConfig
  const updatedConfig = updaterFn(currentConfig)
  await fs.writeFile(truckConfigPath, JSON.stringify(updatedConfig, null, 2))
}

export function getArgs(): TruckConfig {
  const args = yargs.config({
    extends: './truckconfig.json',
  }).argv as TruckUserConfig

  return {
    path: ".",
    branch: null,
    ignoredFiles: [] as string[],
    ...args
  } as TruckConfig
}

export async function parse(useCache = true) {
  const args = getArgs()
  console.log("ignored: " + args.ignoredFiles.join(", "))

  if (args?.log) {
    setLogLevel(args.log as string)
  }


  let repoDir = args.path
  if (!isAbsolute(repoDir))
    repoDir = resolve(process.cwd(), repoDir)

  const branch = args.branch

  const ignoredFiles = args.ignoredFiles
  const truckignore = ignore().add(ignoredFiles)

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

  console.log("")
  console.log("Ignored files: " + args.ignoredFiles.join(", "))
  console.log("")

  const dataPath = getOutPathFromRepoAndBranch(repoName, branchName)
  if (fsSync.existsSync(dataPath)) {
    const path = getOutPathFromRepoAndBranch(repoName, branchName)
    const cachedData = JSON.parse(await fs.readFile(path, "utf8")) as ParserData
    // Check if the current branchHead matches the hash of the parsed commit from the cache
    const branchHeadMatches = branchHead === cachedData.commit.hash
    // Check if the files that are ignored are the same
    const truckIgnoreIsTheSame = (cachedData?.ignoredFiles ?? []).slice().sort().join("\n") === ignoredFiles.slice().sort().join("\n")
    // Check if the data uses the most recent parser data interface
    const dataVersionMatches = cachedData.interfaceVersion === ParserDataInterfaceVersion

    const cacheConditions = {branchHeadMatches, dataVersionMatches, truckIgnoreIsTheSame, refresh: !useCache }

    // Only return cached data if every criteria is met
    if (Object.values(cacheConditions).every(Boolean)) return cachedData
    else {
      const reasons = Object.entries(cacheConditions).filter(([, value]) => !value).map(([key, value]) => `${key}: ${value}`).join(", ")
      log.info(`Reparsing, since the following cache conditions were not met: ${reasons}`)
    }
  }

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

  const defaultOutPath = getOutPathFromRepoAndBranch(repoName, branchName)
  let outPath = resolve(args.out as string ?? defaultOutPath)
  if (!isAbsolute(outPath))
    outPath = resolve(process.cwd(), outPath)

  const authorUnions = args.unionedAuthors as string[][]
  const data : ParserData = {
    cached: false,
    ignoredFiles,
    repo: repoName,
    branch: branchName,
    commit: hydratedRepoTree,
    authorUnions: authorUnions,
    interfaceVersion: ParserDataInterfaceVersion
  }
  await describeAsyncJob(
    () =>
      writeRepoToFile(outPath, {...data, cached: true}),
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

export function getOutPathFromRepoAndBranch(repoName: string, branchName: string) {
  return resolve(__dirname, "..", ".temp", repoName, `${branchName}.json`)
}
