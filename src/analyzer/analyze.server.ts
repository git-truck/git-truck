import { promises as fs } from "fs"
import type {
  GitBlobObject,
  GitCommitObject,
  GitCommitObjectLight,
  GitTreeObject,
  AnalyzerData,
  TruckUserConfig,
  TruckConfig,
} from "./model"
import { AnalyzerDataInterfaceVersion } from "./model"
import { log, setLogLevel } from "./log.server"
import { describeAsyncJob, formatMs, writeRepoToFile, getDirName } from "./util.server"
import { GitCaller } from "./git-caller.server"
import { emptyGitCommitHash } from "./constants"
import { resolve, isAbsolute, sep } from "path"
import { performance } from "perf_hooks"
import { hydrateData } from "./hydrate.server"
import {} from "@remix-run/node"
import ignore from "ignore"
import { applyIgnore, applyMetrics, initMetrics, TreeCleanup } from "./postprocessing.server"
import pkg from "../../package.json"
import { getCoAuthors } from "./coauthors.server"
import { exec } from "child_process"
import { makeDupeMap, nameUnion } from "~/authorUnionUtil.server"

let repoDir = "."

export async function analyzeCommitLight(hash: string): Promise<GitCommitObjectLight> {
  const rawContent = await GitCaller.getInstance().catFileCached(hash)
  const commitRegex =
    /tree (?<tree>.*)\s*(?:parent (?<parent>.*)\s*)?(?:parent (?<parent2>.*)\s*)?author (?<authorName>.*?) <(?<authorEmail>.*?)> (?<authorTimeStamp>\d*?) (?<authorTimeZone>.*?)\s*committer (?<committerName>.*?) <(?<committerEmail>.*?)> (?<committerTimeStamp>\d*?) (?<committerTimeZone>.*)\s*(?:gpgsig (?:.|\s)*?-----END (?:PGP SIGNATURE|SIGNED MESSAGE)-----)?\s*(?<message>.*)\s*(?<description>(?:.|\s)*)/gm

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

export async function analyzeCommit(repoName: string, hash: string): Promise<GitCommitObject> {
  if (hash === undefined) {
    throw Error("Hash is required")
  }
  const { tree, ...commit } = await analyzeCommitLight(hash)
  const { rootTree, fileCount } = await analyzeTree(repoName, repoName, tree)
  const commitObject = {
    ...commit,
    fileCount,
    tree: rootTree,
  }
  return commitObject
}

const treeRegex = /^\S+? (?<type>\S+) (?<hash>\S+)\s+(?<size>\S+)\s+(?<path>.+)/gm

interface RawGitObject {
  type: "blob" | "tree"
  path: string
  hash: string
  size?: number
}

async function analyzeTree(path: string, name: string, hash: string) {
  const rawContent = await GitCaller.getInstance().lsTree(hash)

  const lsTreeEntries: RawGitObject[] = []
  const matches = rawContent.matchAll(treeRegex)
  let fileCount = 0

  for (const match of matches) {
    if (!match.groups) continue

    const groups = match.groups
    lsTreeEntries.push({
      type: groups["type"] as "blob" | "tree",
      hash: groups["hash"],
      size: groups["size"] === "-" ? undefined : Number(groups["size"]),
      path: groups["path"],
    })
  }

  const rootTree = {
    type: "tree",
    path,
    name,
    hash,
    children: [],
  } as GitTreeObject

  for (const child of lsTreeEntries) {
    log.debug(`Path: ${child.path}`)
    const prevTrees = child.path.split("/")
    const newName = prevTrees.pop() as string
    const newPath = `${path}/${child.path}`
    let currTree = rootTree
    for (const treePath of prevTrees) {
      currTree = currTree.children.find((t) => t.name === treePath && t.type === "tree") as GitTreeObject
    }
    switch (child.type) {
      case "tree":
        const newTree: GitTreeObject = {
          type: "tree",
          path: newPath,
          name: newName,
          hash: child.hash,
          children: [],
        }

        currTree.children.push(newTree)

        break
      case "blob":
        fileCount += 1
        const blob: GitBlobObject = {
          type: "blob",
          hash: child.hash,
          path: newPath,
          name: newName,
          sizeInBytes: child.size as number,
          blameAuthors: {},
        }
        // Don't block the current loop, just add the job to the queue and await it later
        // jobs.push((async () => (blob.blameAuthors = await GitCaller.getInstance().parseBlame(blob.path)))())
        currTree.children.push(blob)
        break
    }
  }

  // await Promise.all(jobs)

  return { rootTree, fileCount }
}

function getCommandLine() {
  switch (process.platform) {
    case "darwin":
      return "open" // MacOS
    case "win32":
      return 'start ""' // Windows
    default:
      return "xdg-open" // Linux
  }
}

export function openFile(path: string) {
  path = resolve(repoDir, "..", path.split("/").join(sep))
  const command = `${getCommandLine()} "${path}"`
  exec(command).stderr?.on("data", (e) => {
    // TODO show error in UI
    log.error(`Cannot open file ${resolve(repoDir, path)}: ${e}`)
  })
}

export async function updateTruckConfig(repoDir: string, updaterFn: (tc: TruckUserConfig) => TruckUserConfig) {
  const truckConfigPath = resolve(repoDir, "truckconfig.json")
  let currentConfig: TruckUserConfig = {}
  try {
    const configFileContents = await fs.readFile(truckConfigPath, "utf-8")
    if (configFileContents) currentConfig = JSON.parse(configFileContents)
  } catch (e) {}
  const updatedConfig = updaterFn(currentConfig)
  await fs.writeFile(truckConfigPath, JSON.stringify(updatedConfig, null, 2))
}

export async function analyze(args: TruckConfig): Promise<AnalyzerData> {
  GitCaller.initInstance(args.path)
  const git = GitCaller.getInstance()

  if (args?.log) {
    setLogLevel(args.log as string)
  }

  repoDir = args.path
  if (!isAbsolute(repoDir)) repoDir = resolve(process.cwd(), repoDir)

  const branch = args.branch

  const hiddenFiles = args.hiddenFiles

  const start = performance.now()
  const [findBranchHeadResult, findBranchHeadError] = await describeAsyncJob({
    job: () => git.findBranchHead(branch),
    beforeMsg: "Finding branch head",
    afterMsg: "Found branch head",
    errorMsg: "Error finding branch head",
  })
  const repoName = getDirName(repoDir)

  if (findBranchHeadError) throw findBranchHeadError

  const [branchHead, branchName] = findBranchHeadResult
  git.branch = branchName

  let data: AnalyzerData | null = null

  if (!args.invalidateCache) {
    const [cachedData, reasons] = await GitCaller.retrieveCachedResult({
      repo: repoName,
      branch: branchName,
      branchHead: branchHead,
    })

    if (cachedData) {
      data = {
        ...cachedData,
        hiddenFiles,
      }
    } else {
      log.info(
        `Reanalyzing, since the following cache conditions were not met:\n${reasons.map((r) => ` - ${r}`).join("\n")}`
      )
    }
  } else {
    GitCaller.getInstance().setUseCache(false)
  }

  if (data === null) {
    const quotePathDefaultValue = await git.getDefaultGitSettingValue("core.quotepath")
    await git.setGitSetting("core.quotePath", "off")
    const renamesDefaultValue = await git.getDefaultGitSettingValue("diff.renames")
    await git.setGitSetting("diff.renames", "true")
    const renameLimitDefaultValue = await git.getDefaultGitSettingValue("diff.renameLimit")
    await git.setGitSetting("diff.renameLimit", "1000000")

    const runDateEpoch = Date.now()
    const [repoTree, repoTreeError] = await describeAsyncJob({
      job: () => analyzeCommit(repoName, branchHead),
      beforeMsg: "Analyzing commit tree",
      afterMsg: "Commit tree analyzed",
      errorMsg: "Error analyzing commit tree",
    })

    if (repoTreeError) throw repoTreeError

    const [hydrateResult, hydratedRepoTreeError] = await describeAsyncJob({
      job: () => hydrateData(repoTree),
      beforeMsg: "Hydrating commit tree",
      afterMsg: "Commit tree hydrated",
      errorMsg: "Error hydrating commit tree",
    })

    if (hydratedRepoTreeError) throw hydratedRepoTreeError

    const [hydratedRepoTree, authors, commits] = hydrateResult

    await git.resetGitSetting("core.quotepath", quotePathDefaultValue)
    await git.resetGitSetting("diff.renames", renamesDefaultValue)
    await git.resetGitSetting("diff.renameLimit", renameLimitDefaultValue)

    const defaultOutPath = GitCaller.getCachePath(repoName, branchName)
    let outPath = resolve((args.out as string) ?? defaultOutPath)
    if (!isAbsolute(outPath)) outPath = resolve(process.cwd(), outPath)

    const authorsUnion = nameUnion(authors, makeDupeMap(args.unionedAuthors ?? []))

    data = {
      cached: false,
      hiddenFiles,
      authors,
      authorsUnion,
      repo: repoName,
      branch: branchName,
      commit: hydratedRepoTree,
      interfaceVersion: AnalyzerDataInterfaceVersion,
      currentVersion: pkg.version,
      lastRunEpoch: runDateEpoch,
      commits,
    }

    await describeAsyncJob({
      job: () =>
        writeRepoToFile(outPath, {
          ...data,
          cached: true,
        } as AnalyzerData),
      beforeMsg: "Writing data to file",
      afterMsg: `Wrote data to ${resolve(outPath)}`,
      errorMsg: `Error writing data to file ${outPath}`,
    })
  }

  const truckignore = ignore().add(hiddenFiles)
  data.commit.tree = applyIgnore(data.commit.tree, truckignore)
  TreeCleanup(data.commit.tree)
  initMetrics(data)
  data.commit.tree = applyMetrics(data, data.commit.tree)

  const stop = performance.now()

  await describeAsyncJob({
    job: () => Promise.resolve(),
    beforeMsg: "",
    afterMsg: `Ready in`,
    errorMsg: "",
    ms: stop - start,
  })

  return data
}
