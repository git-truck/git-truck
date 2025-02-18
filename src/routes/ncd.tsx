import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/ncd"
import { invariant } from "~/util"
import { compress } from "@mongodb-js/zstd"
import { log } from "~/analyzer/log.server"
import { describeAsyncJob, runProcess } from "~/analyzer/util.server"
import { join } from "node:path"
import { useLoaderData } from "react-router"
import { Fragment, useEffect } from "react"
import { execSync } from "child_process"
import { cn } from "~/styling"

export function headers(_: Route.HeadersArgs) {
  _.loaderHeaders
  return {
    // "Cache-Control": "max-age=3600, s-maxage=86400"
  }
}

const resultCache = new Map<string, Awaited<ReturnType<typeof loader>>>()
const catFileCache = new Map<string, Buffer | null>()

const catFile = (repoPath: string, hash: string, filePath: string): Buffer | null => {
  const key = `${repoPath}:${hash}:${filePath}`
  const cachedValue = catFileCache.get(key)
  if (cachedValue !== undefined) {
    return cachedValue
  }
  try {
    const data = Buffer.from(
      execSync(["git", "cat-file", "-p", `${hash}:${filePath}`].join(" "), {
        cwd: repoPath,
        encoding: "utf8"
      })
    )
    catFileCache.set(key, data)
    return data
  } catch (error) {
    catFileCache.set(key, null)
    return null
  }
}

export const loader = async ({
  request
}: Route.LoaderArgs): Promise<{
  tree: import("c:/Users/jonas/p/git-truck/src/analyzer/model").RawGitObject[]
  commits: {
    commitNcdResults: {
      normNcd: number
      diffNCD: number
      commitNCD: number
      hash: string
      hashShort: string
      subject: string
    }[]
    minNcd: number
    maxNcd: number
    avgNcd: number
  }
}> => {
  const abortSignal = request.signal
  const url = new URL(request.url)
  const repo = url.searchParams.get("repo")
  const branch = url.searchParams.get("branch")
  const path = url.searchParams.get("path")

  invariant(repo, "repo is required")
  invariant(branch, "branch is required")
  invariant(path, "path is required")

  const cachedResult = resultCache.get(`${repo}:${branch}:${path}`)
  if (cachedResult) {
    return cachedResult
  }

  const ins = InstanceManager.getOrCreateInstance(repo, branch, path)

  const repoPath = join(path, repo)

  // 1. Read the file tree of the latest revision
  const [fileTree, treeError] = await describeAsyncJob({
    beforeMsg: "Analyzing file tree",
    afterMsg: "Analyzed file tree",
    errorMsg: "Error analyzing file tree",
    job: async () => (await ins.analyzeTreeFlat()).filter((f) => f.size! < 1_000_000)
  })

  if (treeError) {
    throw treeError
  }

  const getResults = async () => {
    // 2. Get all commit hashes

    const commits = ((await runProcess(repoPath, "git", ["log", "--pretty=format:%H,%f"])) as string)
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const components = l.split(",")
        const hash = components[0]
        components.shift()
        const subject = components.join(",")
        return {
          hash,
          hashShort: hash.slice(0, 7),
          subject
        }
      })

    // 3. Read the contents of the initial revision

    const finalRevisionBuffers = fileTree.map((f) => {
      const data = execSync(["git", "cat-file", "-p", f.hash].join(" "), {
        cwd: repoPath,
        encoding: "buffer"
      })
      return data
    })

    log.debug(`Compressing final revision. Size: ${finalRevisionBuffers.length.toLocaleString()} bytes`)
    const bufferFinal = Buffer.concat(finalRevisionBuffers)
    const ccFinal = (await compress(bufferFinal)).length

    async function ncd(fileBuffer: Buffer): Promise<number> {
      const ccCommit = (await compress(fileBuffer)).length
      const combined = Buffer.concat([...finalRevisionBuffers!, fileBuffer])
      const ccCombined = (await compress(combined)).length
      const ncdValue = (ccCombined - Math.min(ccFinal, ccCommit)) / Math.max(ccFinal, ccCommit)
      return ncdValue
    }

    if (abortSignal.aborted) {
      throw Error("Aborted")
    }

    const commitNcdResults = await Promise.all(
      commits.map(async (commit) => {
        const commitFiles = execSync(["git", "show", "--name-only", `--format=""`, commit.hash].join(" "), {
          cwd: repoPath,
          encoding: "utf8"
        })
          .split("\n")
          .filter(Boolean)
        // const fileNCDs = await Promise.all(
        //   commitFiles
        //     .map(async (f) => {
        //       try {
        //         return {
        //           file: f,
        //           ncd: await ncd(
        //             Buffer.from(
        //               execSync(`git cat-file -p "${commit.hash}:${f}"`, {
        //                 cwd: repoPath
        //               })
        //             )
        //           )
        //         }
        //       } catch (error) {
        //         log.error(`Error running command git cat-file -p ${commit.hash}:${f}: ${error}`)
        //         return { file: f, ncd: null }
        //       }
        //     })
        //     .filter(Boolean)
        // )

        let fileMaxNCD = 0
        let fileMinNCD = Infinity

        const commitNCD = await ncd(
          Buffer.concat(
            // commitFiles
            fileTree
              .map(
                (f) => catFile(repoPath, commit.hash, f.path.trim())
                // execSync(`git cat-file blob "${commit.hash}:${f.path}"`, {
                //   cwd: repoPath
                // })
              )
              .filter(Boolean) as Buffer[]
          )
        )
        // for (const { ncd } of fileNCDs) {
        //   if (ncd === null) {
        //     continue
        //   }
        //   fileMaxNCD = Math.max(fileMaxNCD, ncd)
        //   fileMinNCD = Math.min(fileMinNCD, ncd)
        // }

        return {
          ...commit,
          commitNCD
        }
      })
    )

    let prevCommitNCD = Math.max(...commitNcdResults.map((c) => c.commitNCD))
    let commitMaxNCD = 0
    let commitMinNCD = Infinity

    const diffNCDs: number[] = []
    commitNcdResults.reverse()
    for (const { commitNCD } of commitNcdResults) {
      if (commitNCD === null) {
        continue
      }
      commitMaxNCD = Math.max(commitMaxNCD, commitNCD)
      commitMinNCD = Math.min(commitMinNCD, commitNCD)
      const diffFromLast = commitNCD - prevCommitNCD
      diffNCDs.push(diffFromLast)
      prevCommitNCD = commitNCD
    }

    diffNCDs.reverse()
    commitNcdResults.reverse()

    return {
      commitNcdResults: commitNcdResults.map((commit, i) => ({
        ...commit,
        normNcd: (commit.commitNCD - commitMinNCD) / (commitMaxNCD - commitMinNCD),
        diffNCD: diffNCDs[i] ?? 0
      })),
      minNcd: commitMinNCD,
      maxNcd: commitMaxNCD,
      avgNcd: commitNcdResults.length
        ? commitNcdResults.reduce((acc, { commitNCD }) => acc + commitNCD, 0) / commitNcdResults.length
        : 0
    }
  }

  return {
    tree: fileTree,
    commits: await getResults()
  }
}

export default function Ncd() {
  const { tree, commits } = useLoaderData<typeof loader>()
  const data = commits

  return (
    <div>
      <details>
        <summary>View </summary>
        <div className={`grid gap-2 grid-cols-[${Object.keys(tree[0] || {}).length}]`}>
          {tree.map((f) => (
            <Fragment key={f.hash}>
              {Object.values(f).map((v) => (
                <div key={v}>{v}</div>
              ))}
            </Fragment>
          ))}
        </div>
      </details>

      <div>
        <h1>Results</h1>
        <p>Min NCD: {data.minNcd}</p>
        <p>Max NCD: {data.maxNcd}</p>
        <p>Avg NCD: {data.avgNcd}</p>
        <p>Commit count: {data.commitNcdResults.length}</p>
        <div className={cn("m-auto grid max-w-2xl grid-cols-[min-content_2fr_min-content_min-content_4fr] gap-1")}>
          {data.commitNcdResults.map((commit, i) => (
            <Fragment key={commit.hash}>
              <div title={commit.hash}>{commit.hashShort}</div>
              <div className="truncate" title={commit.subject}>
                {commit.subject}
              </div>
              <div>{commit.commitNCD.toLocaleString()}</div>
              <div className={cn({
                "text-red-500": commit.diffNCD > 0,
                "text-green-500": commit.diffNCD < 0
              })}>{commit.diffNCD.toLocaleString()}</div>
              <Bar value={commit.diffNCD} className="h-full rounded-full" />


              {/* {commit.files.map((file) => (
                <Fragment key={file.file}>
                  <style
                    dangerouslySetInnerHTML={{
                      __html: `
                      div._${commit.hashShort} { display: none; }
                      input._${commit.hashShort}:checked ~ div._${commit.hashShort} { display: block; }
                    `
                    }}
                  ></style>
                  <div className={cn("_" + commit.hashShort)}>➡️</div>
                  <div className={cn("_" + commit.hashShort)}>{file.file}</div>
                  <div className={"_" + commit.hashShort} title={file.ncd?.toFixed(2)}>
                    {file.ncd?.toFixed(2)}
                  </div>
                  <Bar
                    value={file.normNcd * commit.normNcd}
                    className={cn("h-full rounded-full", "_" + commit.hashShort)}
                  />
                  <div className={cn("_" + commit.hashShort)} />
                </Fragment>
              ))} */}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("h-2", className, {
        "bg-red-500": value > 0,
        "bg-green-500": value < 0
      })}
      style={{ width: `${Math.abs(value) * 100}%` }}
      title={`Distance: ${(value * 100).toFixed(2)}%`}
    />
  )
}

function tryOrElse<T>(fn: () => T, elseValue: T): T {
  try {
    return fn()
  } catch (error) {
    return elseValue
  }
}
