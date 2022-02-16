import path from "path"
import { promises as fs } from "fs"
import { GitBlobObject, GitCommitObject, GitCommitObjectLight, GitTreeObject, Person } from "./model.js"
import { log } from "./log.js"
import { runProcess } from "./util.js"
import { emptyGitTree } from "./constants.js"

export async function findBranchHead(repo: string, branch: string) {
  const gitFolder = path.join(repo, ".git")

  // Find file containing the branch head
  const branchPath = path.join(gitFolder, "refs/heads/" + branch)
  const absolutePath = path.join(process.cwd(), branchPath)
  log.debug("Looking for branch head at " + absolutePath)

  const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
  log.debug(`${branch} -> [commit]${branchHead}`)

  return branchHead
}

export async function deflateGitObject(repo: string, hash: string) {
  const result = await runProcess(repo, "git", ["cat-file", "-p", hash])
  return result as string
}


export async function parseCommitLight(repo: string, hash: string): Promise<GitCommitObjectLight> {
  const commitRegex = /^tree (?<tree>.*)\n(?:parent (?<parent>.*)\n)?(?:parent (?<parent2>.*)\n)?author (?<authorName>.*) <(?<authorEmail>.*)> (?<authorTimeStamp>\d*) (?<authorTimeZone>.*)\ncommitter (?<committerName>.*) <(?<committerEmail>.*)> (?<committerTimeStamp>\d*) (?<committerTimeZone>.*)\n(?:gpgsig (?:.|\n)*-----END PGP SIGNATURE-----)?\n*(?<message>.*)\n*(?<description>(.|\n|\r)*)/g;
  const rawContent = await deflateGitObject(repo, hash)
  const match = commitRegex.exec(rawContent)
  let groups = match?.groups ?? {}

  let tree = groups["tree"]
  let parent = groups["parent"] ?? emptyGitTree
  let parent2 = groups["parent2"] ?? null
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
  let description = groups["description"]
  let coauthors = getCoAuthors(description)

  return {
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

export async function parseCommit(repo: string, hash: string): Promise<GitCommitObject> {
  const {tree, ...commit} = await parseCommitLight(repo, hash)
  return {
    ...commit,
    tree: await parseTree(repo, ".", tree),
  }
}

function getCoAuthors(description: string) {
  let coauthorRegex = /.*Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  let coauthormatches = description.matchAll(coauthorRegex)
  let next = coauthormatches.next()
  let coauthors: Person[] = []

  while (next.value !== undefined) {
    coauthors.push(
      {
        name: next.value.groups["name"].trimEnd(), 
        email: next.value.groups["email"]
      }
    )
    next = coauthormatches.next()
  }
  return coauthors
}

async function parseTree(repo: string, name: string, hash: string): Promise<GitTreeObject> {
  const rawContent = await deflateGitObject(repo, hash)
  const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

  const children = await Promise.all(
    entries.map(async (line) => {
      const [_, type, hash, name] = line.split(/\s+/)

      switch (type) {
        case "tree":
          return await parseTree(repo, name, hash)
          case "blob":
          return await parseBlob(repo, name, hash, true)
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

async function parseBlob(repo: string, name: string, hash: string, light = false): Promise<GitBlobObject> {
  const content = await deflateGitObject(repo, hash)
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
