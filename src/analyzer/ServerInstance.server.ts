import DB from "./DB"
import { GitCaller } from "./git-caller.server"
import { AnalyzerDataInterfaceVersion } from "./model";
import type { AnalyzerData, TruckConfig } from "./model"
import { log, setLogLevel } from "./log.server"
import { resolve, isAbsolute } from "path"
import { describeAsyncJob, getDirName, writeRepoToFile } from "./util.server"
import { analyzeCommit } from "./analyze.server"
import { hydrateData } from "./hydrate.server"
import { makeDupeMap, nameUnion } from "~/authorUnionUtil.server"
import pkg from "../../package.json"
import ignore from "ignore"
import { TreeCleanup, applyIgnore, applyMetrics, initMetrics } from "./postprocessing.server"

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
            job: () => analyzeCommit(repoName, branchHead),
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
}
