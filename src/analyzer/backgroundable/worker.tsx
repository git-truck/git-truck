// eslint-disable-next-line @typescript-eslint/no-var-requires
const { workerData, parentPort } = require("worker_threads")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolve } = require("path")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { spawn } = require("child_process")


    const results  = []
        if (!workerData.branch) throw Error("branch not set")
    const logsRaw = runProcess(workerData.repo, "git", ["log", workerData.branch, "--pretty='%ct;%s;'", workerData.path]).toString()
    const matchTextBetweenQuotes = /^["'](.*?)['"]$/gm // This regex matches everything between quotes (' or ") 
    const commitsMatch = logsRaw.matchAll(matchTextBetweenQuotes)
    for (const commit of commitsMatch) {
      const commitSplit = commit[0].replace(/(^['"]|["']$)/g, "").split(";", 2)
      results.push({
        date: parseInt(commitSplit[0]), 
        message: commitSplit[1]})
    }
console.log(results)


function runProcess(dir, command, args) {
      const prcs = spawn(command, args, {
        cwd: resolve(dir),
      })
      const chunks = []
      prcs.stdout.on("end", () => {
        resolve(Buffer.concat(chunks).toString().trim())
      })
      return chunks
}




parentPort.postMessage({ fileName: workerData, status: "Done" })
