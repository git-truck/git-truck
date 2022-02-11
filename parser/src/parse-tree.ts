import path from "path"
import { promises as fs } from "fs"
import { lookupAndDecompressFromHash } from "./parser.js"
import { GitCommitObject, GitTreeObject } from "./model.js"

export async function findBranchHead(repo: string, branch: string) {
  const gitFolder = path.join(repo, ".git")

  // Find file containing the branch head
  const branchPath = path.join(gitFolder, "refs/heads/" + branch)
  const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()

  // const rawObject = await parseFile(commitObjectPath)
  const rawObject = await lookupAndDecompressFromHash(repo, branchHead)

  const [objectHeader, content] = rawObject.split("\u0000", 2)
  let [type] = objectHeader.split(" ")

  if (type !== "commit") {
    throw Error("Expected commit object, got " + type)
  }

  return await parseCommit(repo, branchHead, content)
}

// return parseCommit(branchHead, content)
// function parseCommit(hash: string, rawCommit: string)
// // : GitCommitObject
// {
//   const items = rawCommit.split("\n", 4)

//   const [tree, parent, author, committer] = items
//   console.log({ tree, parent, author, committer})
//   //   .slice(0)
//   //   .reverse()
//   //   .map((x) => x.split(/(?:tree|parent|author|committer) (.*)/)[1])
//   // return { hash, tree, parent, author, committer, message }
//   // const commitRegex = /^tree (?<tree>[0-9a-f]{40})\nparent (?<parent>[0-9a-f]{40})\nauthor (?<author>.*)\ncommitter (?<commiter>.*)\n+(?<message>.*)$/gm

//   const messageRegex = /^\n\n(?<message>.*)$/gm
//   const groups = rawCommit.match(messageRegex)?.groups
//   if (groups) console.log(groups["message"] )

//   // const x = rawCommit.match(commitRegex)
//   // return x?.groups
// }

async function parseCommit(_repo: string, hash: string, rawContent: string): Promise<GitCommitObject> {
  let split = rawContent.split("\n", 6)
  let tree = split[0].split(" ", 2)[1]
  let parent = split[1].split(" ", 2)[1]
  let author = split[2].substring(7)
  let committer = split[3].substring(10)
  let message = split[5]

  return {
    hash,
    tree: "",
    // tree: (await generateTree(repo, tree)) as unknown as GitTreeObject,
    parent,
    author,
    committer,
    message
  }

}

async function generateTree(content: string) {
  console.log(content)
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
