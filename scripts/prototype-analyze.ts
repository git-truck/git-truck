import ServerInstance from "~/analyzer/ServerInstance.server"
import { GitCaller } from "~/analyzer/git-caller.server"
import { analyze } from "~/routes/view"
import { normalizeAndResolvePath } from "~/shared/util.server"

async function main() {
  const repositoryPath = normalizeAndResolvePath(process.argv[2] ?? process.cwd())
  const branch = process.argv[3] ?? (await GitCaller._getRepositoryHead(repositoryPath))

  const instance = new ServerInstance({ repositoryPath, branch })

  try {
    const result = await analyze({ instance, path: repositoryPath, branch })

    console.log("Analyze completed")
    console.log(`Repo: ${result.databaseInfo.repo}`)
    console.log(`Branch: ${result.databaseInfo.branch}`)
    console.log(`Files: ${result.databaseInfo.fileCount}`)
    console.log(`Commits: ${result.databaseInfo.commitCount}`)
  } finally {
    await instance.db.close()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
