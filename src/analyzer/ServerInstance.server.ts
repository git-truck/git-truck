import DB from "./DB"
import { GitCaller } from "./git-caller.server"
import { AnalyzerDataInterfaceVersion } from "./model";
import type { AnalyzerData, GitBlobObject, GitCommitObject, GitCommitObjectLight, GitTreeObject, TruckConfig, RawGitObject } from "./model"
import { log, setLogLevel } from "./log.server"
import { resolve, isAbsolute } from "path"
import { describeAsyncJob, getDirName, writeRepoToFile } from "./util.server"
import { hydrateData } from "./hydrate.server"
import { makeDupeMap, nameUnion } from "~/authorUnionUtil.server"
import pkg from "../../package.json"
import ignore from "ignore"
import { TreeCleanup, applyIgnore, applyMetrics, initMetrics } from "./postprocessing.server"
import { getCoAuthors } from "./coauthors.server";
import { emptyGitCommitHash, treeRegex } from "./constants";

export type AnalyzationStatus = "Starting" | "Hydrating" | "GeneratingChart" | "Idle"

export default class ServerInstance {
    private analyzationStatus: AnalyzationStatus = "Idle"
    private repoSanitized: string
    private branchSanitized: string
    private gitCaller: GitCaller
    private db: DB

    constructor(private repo: string, private branch: string, public path: string) {
        this.repoSanitized = repo.replace(/\W/g, "_")
        this.branchSanitized = branch.replace(/\W/g, "_")
        this.gitCaller = new GitCaller(repo, branch, path)
        this.db = new DB(repo, branch)
    }

    public async analyze(args: TruckConfig): Promise<AnalyzerData> {
        this.analyzationStatus = "Starting"
      
        if (args?.log) {
          setLogLevel(args.log as string)
        }
      
        let repoDir = args.path
        if (!isAbsolute(repoDir)) repoDir = resolve(process.cwd(), repoDir)
      
        const hiddenFiles = args.hiddenFiles
      
        const start = performance.now()
        const [findBranchHeadResult, findBranchHeadError] = await describeAsyncJob({
          job: () => this.gitCaller.findBranchHead(),
          beforeMsg: "Finding branch head",
          afterMsg: "Found branch head",
          errorMsg: "Error finding branch head"
        })
        const repoName = getDirName(repoDir)
      
        if (findBranchHeadError) throw findBranchHeadError
      
        const [branchHead,] = findBranchHeadResult
        // this.gitCaller.branch = branchName
      
        let data: AnalyzerData | null = null
      
        const [cachedData, reasons] = await GitCaller.retrieveCachedResult({
          repo: repoName,
          branch: this.branch,
          branchHead: branchHead,
          invalidateCache: args.invalidateCache
        })
      
        if (cachedData) {
          data = {
            ...cachedData,
            hiddenFiles
          }
        } else {
          log.info(
            `Reanalyzing, since the following cache conditions were not met:\n${reasons.map((r) => ` - ${r}`).join("\n")}`
          )
        }
      
        if (data === null) {
          const quotePathDefaultValue = await this.gitCaller.getDefaultGitSettingValue("core.quotepath")
          await this.gitCaller.setGitSetting("core.quotePath", "off")
          const renamesDefaultValue = await this.gitCaller.getDefaultGitSettingValue("diff.renames")
          await this.gitCaller.setGitSetting("diff.renames", "true")
          const renameLimitDefaultValue = await this.gitCaller.getDefaultGitSettingValue("diff.renameLimit")
          await this.gitCaller.setGitSetting("diff.renameLimit", "1000000")
      
          const runDateEpoch = Date.now()
          const [repoTree, repoTreeError] = await describeAsyncJob({
            job: () => this.analyzeCommit(repoName, branchHead),
            beforeMsg: "Analyzing commit tree",
            afterMsg: "Commit tree analyzed",
            errorMsg: "Error analyzing commit tree"
          })
      
          if (repoTreeError) throw repoTreeError
      
          const [hydrateResult, hydratedRepoTreeError] = await describeAsyncJob({
            job: () => hydrateData(repoTree, repoName, this.branch, this.gitCaller),
            beforeMsg: "Hydrating commit tree",
            afterMsg: "Commit tree hydrated",
            errorMsg: "Error hydrating commit tree"
          })
      
          if (hydratedRepoTreeError) throw hydratedRepoTreeError
      
          this.analyzationStatus = "GeneratingChart"
      
          const [hydratedRepoTree, authors] = hydrateResult
      
          await this.gitCaller.resetGitSetting("core.quotepath", quotePathDefaultValue)
          await this.gitCaller.resetGitSetting("diff.renames", renamesDefaultValue)
          await this.gitCaller.resetGitSetting("diff.renameLimit", renameLimitDefaultValue)
      
          const defaultOutPath = GitCaller.getCachePath(repoName, this.branch)
          let outPath = resolve((args.out as string) ?? defaultOutPath)
          if (!isAbsolute(outPath)) outPath = resolve(process.cwd(), outPath)
      
          const authorsUnion = nameUnion(authors, makeDupeMap(args.unionedAuthors ?? []))
      
          data = {
            cached: false,
            hiddenFiles,
            authors,
            authorsUnion,
            repo: repoName,
            branch: this.branch,
            commit: hydratedRepoTree,
            interfaceVersion: AnalyzerDataInterfaceVersion,
            currentVersion: pkg.version,
            lastRunEpoch: runDateEpoch,
            commits: {}
          }
      
          if (!args.invalidateCache) {
            await describeAsyncJob({
              job: () =>
                writeRepoToFile(outPath, {
                  ...data,
                  cached: true
                } as AnalyzerData),
              beforeMsg: "Writing data to file",
              afterMsg: `Wrote data to ${resolve(outPath)}`,
              errorMsg: `Error writing data to file ${outPath}`
            })
          }
        }
      
        this.analyzationStatus = "GeneratingChart"
      
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
          ms: stop - start
        })
      
        return data
      }

      private async analyzeCommitLight(hash: string): Promise<GitCommitObjectLight> {
        const rawContent = await this.gitCaller.catFileCached(hash)
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
          timezone: groups["authorTimeZone"]
        }
        const committer = {
          name: groups["committerName"],
          email: groups["committerEmail"],
          timestamp: Number(groups["committerTimeStamp"]),
          timezone: groups["committerTimeZone"]
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
          coauthors
        }
      }
      
      private async analyzeCommit(repoName: string, hash: string): Promise<GitCommitObject> {
        if (hash === undefined) {
          throw Error("Hash is required")
        }
        const { tree, ...commit } = await this.analyzeCommitLight(hash)
        const { rootTree, fileCount } = await this.analyzeTree(repoName, repoName, tree)
        const commitObject = {
          ...commit,
          fileCount,
          tree: rootTree
        }
        return commitObject
      }

      
private async analyzeTree(path: string, name: string, hash: string) {
  const rawContent = await this.gitCaller.lsTree(hash)

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
      path: groups["path"]
    })
  }

  const rootTree = {
    type: "tree",
    path,
    name,
    hash,
    children: []
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
          children: []
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
          blameAuthors: {}
        }
        // await DB.addFile(blob)
        // Don't block the current loop, just add the job to the queue and await it later
        // jobs.push((async () => (blob.blameAuthors = await GitCaller.getInstance().parseBlame(blob.path)))())
        currTree.children.push(blob)
        break
    }
  }

  // await Promise.all(jobs)
  return { rootTree, fileCount }
}

}
