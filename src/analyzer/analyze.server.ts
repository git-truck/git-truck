import fsSync, { promises as fs } from "fs"
import {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  AnalyzerData,
  AnalyzerDataInterfaceVersion,
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
  getDefaultGitSettingValue,
  resetGitSetting,
  setGitSetting,
} from "./util"
import { emptyGitCommitHash } from "./constants"
import { resolve, isAbsolute, join } from "path"
import { performance } from "perf_hooks"
import { getAuthorSet, hydrateData } from "./hydrate.server"
import {} from "@remix-run/node"
import { getArgs } from "./args.server"
import ignore from "ignore"
import { applyIgnore, applyMetrics, initMetrics, TreeCleanup } from "./postprocessing.server"
import latestVersion from "latest-version"
import pkg from "../../package.json"
import { getCoAuthors } from "./coauthors.server"
import { exec } from "child_process"

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

export async function analyzeCommitLight(
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

export async function analyzeCommit(
  repo: string,
  repoName: string,
  hash: string
): Promise<GitCommitObject> {
  const { tree, ...commit } = await analyzeCommitLight(repo, hash)
  return {
    ...commit,
    tree: await analyzeTree(getRepoName(repo), repo, repoName, tree),
  }
}

async function analyzeTree(
  path: string,
  repo: string,
  name: string,
  hash: string
): Promise<GitTreeObject> {
  const rawContent = await deflateGitObject(repo, hash)
  const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

  const children: (GitTreeObject | GitBlobObject)[] = []
  for await (const line of entries) {
    const catFileRegex = /^.+?\s(?<type>\w+)\s(?<hash>.+?)\s+(?<name>.+?)\s*$/g
    const groups = catFileRegex.exec(line)?.groups ?? {}

    const type = groups["type"]
    const hash = groups["hash"]
    const name = groups["name"]

    const newPath = [path, name].join("/")
    log.debug(`Path: ${newPath}`)

    switch (type) {
      case "tree":
        const tree = await analyzeTree(newPath, repo, name, hash)
        children.push(tree)
        break
      case "blob":
        children.push(await analyzeBlob(newPath, repo, name, hash))
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

async function analyzeBlob(
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

function getCommandLine() {
  switch (process.platform) { 
     case 'darwin' : return 'open'; // MacOS
     case 'win32' : return 'start'; // Windows
     default : return 'xdg-open'; // Linux
  }
}

export function openFile(path: string) {
  path = path.split("/").slice(1).join("/") ?? path.split("\\").slice(1).join("\\")
  exec(`${getCommandLine()} ${resolve(path)}`)
  .stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${path}: ${e}`)
  })
}

export async function updateTruckConfig(
  repoDir: string,
  updaterFn: (tc: TruckUserConfig) => TruckUserConfig
) {
  const truckConfigPath = resolve(repoDir, "truckconfig.json")
  let currentConfig: TruckUserConfig = {}
  try {
    const configFileContents = await fs.readFile(truckConfigPath, "utf-8")
    if (configFileContents) currentConfig = JSON.parse(configFileContents)
  } catch (e) {}
  const updatedConfig = updaterFn(currentConfig)
  await fs.writeFile(truckConfigPath, JSON.stringify(updatedConfig, null, 2))
}

export async function analyze(useCache = true) {
  const args = await getArgs()

  if (args?.log) {
    setLogLevel(args.log as string)
  }

  let repoDir = args.path
  if (!isAbsolute(repoDir)) repoDir = resolve(process.cwd(), repoDir)

  const branch = args.branch

  const hiddenFiles = args.hiddenFiles

  const start = performance.now()
  const [branchHead, branchName] = await describeAsyncJob(
    () => findBranchHead(repoDir, branch),
    "Finding branch head",
    "Found branch head",
    "Error finding branch head"
  )
  const repoName = getRepoName(repoDir)

  let data: AnalyzerData | null = null

  const dataPath = getOutPathFromRepoAndBranch(repoName, branchName)
  if (fsSync.existsSync(dataPath)) {
    const path = getOutPathFromRepoAndBranch(repoName, branchName)
    const cachedData = JSON.parse(await fs.readFile(path, "utf8")) as AnalyzerData

    // Check if the current branchHead matches the hash of the analyzed commit from the cache
    const branchHeadMatches = branchHead === cachedData.commit.hash

    // Check if the data uses the most recent analyzer data interface
    const dataVersionMatches =
      cachedData.interfaceVersion === AnalyzerDataInterfaceVersion

    const cacheConditions = {
      branchHeadMatches,
      dataVersionMatches,
      refresh: !useCache,
    }

    // Only return cached data if every criteria is met
    if (Object.values(cacheConditions).every(Boolean)) {
      data = {
        ...cachedData,
        hiddenFiles,
      }
    } else {
      const reasons = Object.entries(cacheConditions)
        .filter(([, value]) => !value)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      log.info(
        `Reanalyzing, since the following cache conditions were not met: ${reasons}`
      )
    }
  }

  if (data === null) {
    const quotePathDefaultValue = await getDefaultGitSettingValue(repoDir, "core.quotepath")
    await setGitSetting(repoDir, "core.quotePath", "off")
    const renamesDefaultValue = await getDefaultGitSettingValue(repoDir, "diff.renames")
    await setGitSetting(repoDir, "diff.renames", "true")
    const renameLimitDefaultValue = await getDefaultGitSettingValue(repoDir, "diff.renameLimit")
    await setGitSetting(repoDir, "diff.renameLimit", "1000000")

    const repoTree = await describeAsyncJob(
      () => analyzeCommit(repoDir, repoName, branchHead),
      "Analyzing commit tree",
      "Commit tree analyzed",
      "Error analyzing commit tree"
    )
    const hydratedRepoTree = await describeAsyncJob(
      () => hydrateData(repoDir, repoTree),
      "Hydrating commit tree",
      "Commit tree hydrated",
      "Error hydrating commit tree"
    )

    await resetGitSetting(repoDir, "core.quotepath", quotePathDefaultValue)
    await resetGitSetting(repoDir, "diff.renames", renamesDefaultValue)
    await resetGitSetting(repoDir, "diff.renameLimit", renameLimitDefaultValue)

    const defaultOutPath = getOutPathFromRepoAndBranch(repoName, branchName)
    let outPath = resolve((args.out as string) ?? defaultOutPath)
    if (!isAbsolute(outPath)) outPath = resolve(process.cwd(), outPath)

    let latestV: string | undefined
  
    try {
      latestV = await latestVersion(pkg.name)
    } catch {}

    const authorUnions = args.unionedAuthors as string[][]
    data = {
      cached: false,
      hiddenFiles,
      authors: getAuthorSet(),
      repo: repoName,
      branch: branchName,
      commit: hydratedRepoTree,
      authorUnions: authorUnions,
      interfaceVersion: AnalyzerDataInterfaceVersion,
      currentVersion: pkg.version,
      latestVersion: latestV
    }

    await describeAsyncJob(
      () =>
        writeRepoToFile(outPath, {
          ...data,
          cached: true,
        } as AnalyzerData),
      "Writing data to file",
      `Wrote data to ${resolve(outPath)}`,
      `Error writing data to file ${outPath}`
    )
  }

  const truckignore = ignore().add(hiddenFiles)
  data.commit.tree = applyIgnore(data.commit.tree, truckignore)
  TreeCleanup(data.commit.tree)
  initMetrics(data)
  data.commit.tree = applyMetrics(data, data.commit.tree)

  const stop = performance.now()

  log.raw(`\nDone in ${formatMs(stop - start)}`)

  return data
}

export function getOutPathFromRepoAndBranch(
  repoName: string,
  branchName: string
) {
  return resolve(__dirname, "..", ".temp", repoName, `${branchName}.json`)
}
