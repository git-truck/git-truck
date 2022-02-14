import path from "path"
import { promises as fs } from "fs"
import { GitBlobObject, GitCommitObject, GitCommitObjectLight, GitTreeObject } from "./model.js"
import { debugLog } from "./debug.js"
import { runProcess } from "./util.js"

export async function findBranchHead(repo: string, branch: string) {
  const gitFolder = path.join(repo, ".git")

  // Find file containing the branch head
  const branchPath = path.join(gitFolder, "refs/heads/" + branch)
  const absolutePath = path.join(process.cwd(), branchPath)
  debugLog("Looking for branch head at " + absolutePath)

  const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
  debugLog(`${branch} -> [commit]${branchHead}`)

  return branchHead
}

export async function deflateGitObject(hash: string) {
  const result = await runProcess("git", ["cat-file", "-p", hash])
  return result as string
}


export async function parseCommitLight(hash: string): Promise<GitCommitObjectLight> {
  // ^tree (?<tree>.*)\n(parent (?<parent>.*)\n)?(parent (?<parent2>.*)\n)?author (?<authorName>.*) <(?<authorEmail>.*)> (?<authorTimeStamp>\d*) (?<authorTimeZone>.*)\ncommitter (?<committerName>.*) <(?<committerEmail>.*)> (?<committerTimeStamp>\d*) (?<committerTimeZone>.*)\n(gpgsig (.|\n)*-----END PGP SIGNATURE-----)?\n*(?<message>(?:.|\n)*)$
  const commitRegex = /^tree (?<tree>.*)\n(parent (?<parent>.*)\n)?(parent (?<parent2>.*)\n)?author (?<authorName>.*) <(?<authorEmail>.*)> (?<authorTimeStamp>\d*) (?<authorTimeZone>.*)\ncommitter (?<committerName>.*) <(?<committerEmail>.*)> (?<committerTimeStamp>\d*) (?<committerTimeZone>.*)\n(gpgsig (.|\n)*-----END PGP SIGNATURE-----)?\n*(?<message>(?:.|\n)*)$/gm
  const rawContent = await deflateGitObject(hash)
  const match = commitRegex.exec(rawContent)
  let groups = match?.groups ?? {}

  let tree = groups["tree"]
  let parent = groups["parent"]
  let parent2 = groups["parent2"]
  let author = {
    name: groups["authorName"],
    email: groups["authorEmail"],
    timestamp: Number(groups["authorTimeStamp"]),
    timezone: groups["authorTimeZone"]
  }
  let committer = {
    name: groups["committerName"],
    email: groups["committerEmail"],
    timestamp: Number(groups["committerTimeStamp"]),
    timezone: groups["committerTimeZone"]
  }
  let message = groups["message"]

  return {
    hash,
    tree,
    parent,
    parent2,
    author,
    committer,
    message,
  }
}

export async function parseCommit(hash: string): Promise<GitCommitObject> {
  const {tree, ...commit} = await parseCommitLight(hash)
  return {
    ...commit,
    tree: await parseTree(".", tree),
  }
}

async function parseTree(name: string, hash: string): Promise<GitTreeObject> {
  const rawContent = await deflateGitObject(hash)
  const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

  const children = await Promise.all(
    entries.map(async (line) => {
      const [_, type, hash, name] = line.split(/\s+/)

      switch (type) {
        case "tree":
          return await parseTree(name, hash)
          case "blob":
          return await parseBlob(name, hash, true)
          default:
            throw new Error(` type ${type}`)
      }
    })
  )
  return {
    type: "tree",
    name,
    hash,
    children,
  }
}


async function parseBlob(name: string, hash: string, light = false): Promise<GitBlobObject> {
  const content = await deflateGitObject(hash)
  const blob: GitBlobObject = {
    type: "blob",
    hash,
    name,
    content: light ? "" : content,
    noLines: content.split("\n").length,
    authors: {}
  }
  return blob
}
/*
Commit:
tree 88cb57acb1251dea602321f45d538abd881e60e6
parent 086a9b12708b8280b67e3d95455156a12bbf7d0b
author joglr <1959615+joglr@users.noreply.github.com> 1644527351 +0100
committer Jonas Glerup Røssum <1959615+joglr@users.noreply.github.com> 1644527369 +0100

skipLibCheck: true


Tree:
100644 blob 03c1a216e09aa778cff91b7423ffc0fbfb981276    .gitignore
100644 blob cce9d3c0801773cf33a36f6e57afe78a06eebb89    .prettierrc
100644 blob 45fd5a057d0d944709b8e665c811a4e716ebdc02    README.md
040000 tree 1d0d12bb391f04b6b69db2550cc1469498a04212    parser
100644 blob 38bef5ed49d7774c58dd4c6a4784d42d433fda85    project-statement.md
040000 tree 56d24ba148c4718c17c77af4f61b708591acde68    prototype1
100644 blob b1b5f91e5ffd7f66fc94356a571e3c60a689c4e5    vite.config.js
*/
