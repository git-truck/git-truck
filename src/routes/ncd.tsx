import InstanceManager from "~/analyzer/InstanceManager.server"
import type { Route } from "./+types/ncd"
import { invariant } from "~/util"
import { compress } from "@mongodb-js/zstd"
import { log } from "~/analyzer/log.server"
import { describeAsyncJob, formatMsTime, promiseHelper, runProcess, time } from "~/analyzer/util.server"
import { join } from "node:path"
import { useLoaderData } from "react-router"
import { Fragment } from "react"
import { cn } from "~/styling"
import { exec, execFile, execFileSync, spawn } from "node:child_process"
import { GitCaller } from "~/analyzer/git-caller.server"

export function headers(_: Route.HeadersArgs) {
  _.loaderHeaders
  return {
    // "Cache-Control": "max-age=3600, s-maxage=86400"
  }
}

const resultCache = new Map<string, Awaited<ReturnType<typeof loader>>>()
const catFileCache = new Map<string, Buffer | null>()
const erase = "\x1b[1A\x1b[K"
const largeFileThreshold = 100_000
const EMPTY_COMMIT = "0000000000000000000000000000000000000000"
const NUL = "\0"

export const loader = async ({
  request
}: Route.LoaderArgs): Promise<{
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
  const catFile = async (repoPath: string, hash: string, filePath?: string): Promise<Buffer | null> => {
    const key = `${repoPath}:${hash}:${filePath ?? ""}`
    const cachedValue = catFileCache.get(key)
    if (cachedValue !== undefined) {
      return cachedValue
    }

    try {
      const gitArgs = ["cat-file", "blob", hash + (filePath ? `:${filePath}` : "")]
      // log.info(`> git ${gitArgs.join(" ")}`)
      const result: Buffer<ArrayBufferLike> = await new Promise((resolve, reject) => {
        const process = spawn("git", gitArgs, {
          cwd: repoPath,
          killSignal: "SIGKILL",
          stdio: ["ignore", "pipe", "ignore"]
        })
        const buffers: Buffer[] = []
        process.stdout.on("data", (data) => {
          buffers.push(data)
        })
        process.on("error", reject)
        process.on("exit", (code) => {
          if (code === 0) {
            resolve(Buffer.concat(buffers))
          } else {
            reject(new Error(`git cat-file exited with code ${code}`))
          }
        })
      })

      // const firstLine = result.toString().split("\n")[0]
      // log.info(`cat-file: ${firstLine}`)

      catFileCache.set(key, result)
      return result
    } catch (error) {
      catFileCache.set(key, null)
      if (!(error instanceof Error)) {
        throw new Error(`Error reading blob ${hash} (${filePath ?? "unknown"}): ${error}`)
      }
      if (error.message.includes("Not a valid object name")) {
        log.warn(`File ${filePath} not found in commit ${hash}`)
        return null
      }
      throw error
    }
  }
  const abortSignal = request.signal
  const url = new URL(request.url)
  const repo = url.searchParams.get("repo")
  const branch = url.searchParams.get("branch")
  const path = url.searchParams.get("path")

  invariant(repo, "repo is required")
  invariant(branch, "branch is required")
  invariant(path, "path is required")

  // console.log(await difftree(join(path, repo), branch))
  // return null

  const cachedResult = resultCache.get(`${repo}:${branch}:${path}`)
  if (cachedResult) {
    return cachedResult
  }

  const ins = InstanceManager.getOrCreateInstance(repo, branch, path)

  const repoPath = join(path, repo)

  const getResults = async () => {
    // 1. Read the file tree of the latest revision
    let [fileTree, treeError] = await describeAsyncJob({
      beforeMsg: `Analyzing file tree for ${repo}@${branch}`,
      afterMsg: "Analyzed file tree",
      errorMsg: "Error analyzing file tree",
      job: async () => await ins.analyzeTreeFlat()
    })

    if (fileTree === null) {
      throw treeError
    }

    let countBefore = fileTree.length
    let allHasSize = fileTree.every((x) => x.size !== undefined)
    if (!allHasSize) {
      log.warn("Not all files have size")
    }

    const removedFiles = fileTree.filter((x) => x.size >= largeFileThreshold)
    fileTree = fileTree.filter((x) => x.size < largeFileThreshold)

    let countAfter = fileTree.length
    log.info(`Filtered out ${countBefore - countAfter} of ${countBefore} files`)
    log.info(
      `Removed files: ${removedFiles.sort(
        (a, b) => (a.size ?? 0) - (b.size ?? 0)
      ).map((x) => `${x.path} (size: ${x.size?.toLocaleString()} bytes)`).join(", ")}`
    )
    log.info(`Largest file : ${Math.max(...fileTree.map((x) => x.size ?? 0).filter(Boolean)).toLocaleString()} bytes`)
    log.info(`Smallest file: ${Math.min(...fileTree.map((x) => x.size ?? 0).filter(Boolean)).toLocaleString()} bytes`)
    //  && x.path.includes("components"))

    // 2. Get all commit hashes

    const commits = (
      (await time(runProcess, "Read commit hashes")(repoPath, "git", ["log", "--pretty=format:%H,%f"])) as string
    )
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

    // TODO: Stream commits, for the mean time, limit to 10
    // .slice(0, 10)

    // 3. Read the contents of the initial revision

    const frbGoal = fileTree.length
    const frbStartTime = performance.now()
    let lastPrintTime = performance.now()
    console.log("")

    const finalRevisionBuffers = await time(
      () =>
        Promise.all(
          fileTree.map(async (f, i, all) => {
            if (i + 1 === all.length || performance.now() - lastPrintTime > 1000 / 30) {
              lastPrintTime = performance.now()
              const ellapsedTime = performance.now() - frbStartTime
              const elapsedTimeFormatted = formatMsTime(ellapsedTime)

              const estimatedTimeRemaining = ((frbGoal - (i + 1)) * ellapsedTime) / (i + 1)
              const estimatedTotalTime = ellapsedTime + estimatedTimeRemaining

              const percent = ((i + 1) / frbGoal) * 100
              process.stdout.write(
                `${erase}\n[${(i + 1).toLocaleString()}/${frbGoal.toLocaleString()}] (${percent.toFixed(
                  2
                )}%) files processed (elapsed: ${elapsedTimeFormatted}, time remaining: ${formatMsTime(
                  estimatedTimeRemaining
                )}, total time estimate: ${formatMsTime(
                  estimatedTotalTime
                )}, time per file: ${formatMsTime(ellapsedTime / (i + 1))})`
              )
            }
            const [result, err] = await promiseHelper(catFile(repoPath, f.hash))
            if (err) {
              log.error(`Error reading file ${f.hash}: ${err}`)
              return null
            }
            return result
          })
        ),
      "Read initial revision"
    )()

    const count = finalRevisionBuffers.length
    const filteredRevisionBuffers = finalRevisionBuffers.filter(Boolean) as Buffer[]
    const countFiltered = filteredRevisionBuffers.length
    const skippedFileCount = count - countFiltered
    if (skippedFileCount) {
      log.info(`Skipped ${skippedFileCount} of ${count} files`)
    }

    log.info(
      `Compressing final revision (${filteredRevisionBuffers.reduce((acc, b) => acc + b.length, 0).toLocaleString()} bytes)`
    )
    const bufferFinal = Buffer.concat(filteredRevisionBuffers)
    const ccFinal = (await time(compress, "Compress final revision")(bufferFinal)).length

    async function ncd(fileBuffer: Buffer): Promise<number> {
      const ccCommit = (await compress(fileBuffer)).length
      const combined = Buffer.concat([...filteredRevisionBuffers, fileBuffer])
      const ccCombined = (await compress(combined)).length
      const ncdValue = (ccCombined - Math.min(ccFinal, ccCommit)) / Math.max(ccFinal, ccCommit)
      return ncdValue
    }

    if (abortSignal.aborted) {
      throw Error("Aborted")
    }

    const ncdGoal = commits.length
    const ncdStartTime = performance.now()
    console.log()

    const commitNcdResults = await time(async () => {
      const results = []
      let i = 0
      for (const commit of commits) {
        if (i + 1 === ncdGoal || performance.now() - lastPrintTime > 1000 / 30) {
          process.stdout.write(`${erase}\nProcessing commit ${commit.hashShort} (${i + 1}/${ncdGoal})`)
          lastPrintTime = performance.now()
        }
        const commitFiles = (await lstree(repoPath, commit.hash)).files.filter((f) => f.hash !== EMPTY_COMMIT)
        // const commitFiles = (await difftree(repoPath, commit.hash)).files.filter((f) => f.hash !== EMPTY_COMMIT)

        const committedFileData = []

        for (const f of commitFiles) {
          const result = await catFile(repoPath, f.hash)
          committedFileData.push(result)
        }

        const filteredCommittedFiles = committedFileData.filter(Boolean) as Array<Buffer>

        const files = committedFileData.length
        const filesFiltered = filteredCommittedFiles.length
        const concatenatedFileBuffer = Buffer.concat(filteredCommittedFiles)

        const commitNCD = await ncd(concatenatedFileBuffer)

        // Progress bar
        if (i + 1 === ncdGoal || performance.now() - lastPrintTime > 1000 / 30) {
          lastPrintTime = performance.now()
          const ellapsedTime = performance.now() - ncdStartTime
          const elapsedTimeFormatted = formatMsTime(ellapsedTime)

          const estimatedTimeRemaining = ((ncdGoal - i) * ellapsedTime) / i
          const estimatedTotalTime = ellapsedTime + estimatedTimeRemaining

          const percent = ((i + 1) / ncdGoal) * 100

          process.stdout.write(
            `${erase}\n[${(i + 1).toLocaleString()}/${ncdGoal.toLocaleString()}] (${percent.toFixed(
              2
            )}%) commits processed (elapsed: ${elapsedTimeFormatted}, time remaining: ${formatMsTime(
              estimatedTimeRemaining
            )}, total time estimate: ${formatMsTime(
              estimatedTotalTime
            )}, time per commit: ${formatMsTime(ellapsedTime / (i + 1))})`
          )
        }

        results.push({
          ...commit,
          commitNCD,
          files,
          filesFiltered
        })
        i++
      }
      return results
    }, "Calculate NCD")()

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
    commits: await time(getResults)()
  }
}

async function difftree(repoPath: string, commit: string) {
  // r: recursive
  // z: terminate with NUL
  const [hash, ...entries] = await new Promise<Array<string>>((resolve, reject) =>
    execFile(
      "git",
      ["diff-tree", "-r", "-z", commit],
      {
        cwd: repoPath
      },
      (error, stdout) => {
        if (error) {
          reject(error)
        } else {
          resolve(stdout.split(NUL).filter(Boolean))
        }
      }
    )
  )
  const files = []
  for (let i = 0; i < entries.length; i += 2) {
    const [data, fileName] = entries.slice(i, i + 2)
    const [oldmode, newmode, oldHash, hash, ...rest] = data.split(/\s+/)
    files.push({ fileName, oldHash, hash })
  }
  return {
    hash,
    files
  }
}

async function lstree(repoPath: string, hash: string) {
  const entries = await new Promise<Array<string>>((resolve, reject) =>
    execFile(
      "git",
      ["ls-tree", "-r", hash],
      {
        cwd: repoPath
      },
      (error, stdout) => {
        if (error) {
          reject(error)
        } else {
          resolve(stdout.split("\n").filter(Boolean))
        }
      }
    )
  )
  const files = []
  for (const data of entries) {
    const [mode, type, hash, filename] = data.split(/\s+/)
    files.push({ fileName: filename, hash })
  }
  return {
    hash,
    files
  }
}

export default function Ncd() {
  const { commits } = useLoaderData<typeof loader>()
  const data = commits

  return (
    <div>
      {/* <details>
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
      </details> */}

      <div>
        <h1>Results</h1>
        <p>Min NCD: {data.minNcd}</p>
        <p>Max NCD: {data.maxNcd}</p>
        <p>Avg NCD: {data.avgNcd}</p>
        <p>Commit count: {data.commitNcdResults.length}</p>
        <div className="m-auto grid max-w-2xl grid-cols-[min-content_2fr_min-content_min-content_4fr] gap-1 *:border-b *:border-black">
          <div className="font-bold">Hash</div>
          <div className="font-bold">Subject</div>
          <div className="font-bold">NCD</div>
          <div className="font-bold">Diff</div>
          <div className="font-bold">Plot</div>

          {data.commitNcdResults.map((commit, i) => (
            <Fragment key={commit.hash}>
              <div title={commit.hash}>{commit.hashShort}</div>
              <div className="max-w-64 truncate" title={commit.subject}>
                {commit.subject}
              </div>
              <div>{commit.commitNCD.toLocaleString()}</div>
              <div
                className={cn({
                  "text-red-500": commit.diffNCD > 0,
                  "text-green-500": commit.diffNCD < 0
                })}
              >
                {commit.diffNCD.toLocaleString()}
              </div>
              <div>
                <Bar value={commit.diffNCD} className="h-full rounded-full" />
              </div>

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
