import { parentPort } from "worker_threads"

parentPort.on("message", (data) => {
  const renamedFiles = []
  const authors = []
  const commits = {}
  const groups = data.commit.groups ?? {}
  const author = groups.author
  const time = Number(groups.date)
  const body = groups.body
  const message = groups.message
  const hash = groups.hash
  commits[hash] = { author, time, body, message, hash }
  const contributionsString = groups.contributions
  const coauthors = body ? getCoAuthors(body) : []
  authors.push(author)
  coauthors.forEach((coauthor) => authors.push(coauthor.name))

  const contribMatches = contributionsString.matchAll(contribRegex)

  for (const contribMatch of contribMatches) {
    const file = contribMatch.groups?.file.trim()
    const isBinary = contribMatch.groups?.bin !== undefined
    if (!file) throw Error("file not found")

    const hasBeenMoved = file.includes("=>")

    let filePath = file
    if (hasBeenMoved) {
      filePath = analyzeRenamedFile(filePath, renamedFiles)
    }

    const newestPath =
      renamedFiles.find(function (element) {
        return filePath == element
      }) ?? filePath

    const contribs = Number(contribMatch.groups?.contribs)
    if (contribs < 1) continue
    const blob = lookupFileInTree(data.repoTree.tree, newestPath)
    if (!blob) {
      continue
    }
    if (!blob.commits) blob.commits = []
    blob.commits.push(hash)
    blob.noCommits = (blob.noCommits ?? 0) + 1
    if (!blob.lastChangeEpoch) blob.lastChangeEpoch = time
    
     if (isBinary) {
        blob.isBinary = true
        blob.authors[author] = (blob.authors[author] ?? 0) + 1

        for (const coauthor of coauthors) {
          blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + 1
        }
        continue
      }

      blob.authors[author] = (blob.authors[author] ?? 0) + contribs

      for (const coauthor of coauthors) {
        blob.authors[coauthor.name] = (blob.authors[coauthor.name] ?? 0) + contribs
      }
    }
  parentPort.postMessage(commits)
})


// ------------------------------------------------------
// Supporting fucntions
export function getCoAuthors(description) {
  const coauthorRegex = /.*Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  const coauthormatches = description.matchAll(coauthorRegex)
  let next = coauthormatches.next()
  const coauthors = []

  while (next.value !== undefined) {
    coauthors.push({
      name: next.value.groups["name"].trimEnd(),
      email: next.value.groups["email"],
    })
    next = coauthormatches.next()
  }
  return coauthors
}

const contribRegex = /(?<file>.*?)\s*\|\s*((?<contribs>\d+)|(?<bin>Bin)).*/gm

function analyzeRenamedFile(file, renamedFiles) {
  const movedFileRegex = /(?:.*{(?<oldPath>.*)\s=>\s(?<newPath>.*)}.*)|(?:^(?<oldPath2>.*) => (?<newPath2>.*))$/gm
  const replaceRegex = /{.*}/gm
  const match = movedFileRegex.exec(file)
  const groups = match?.groups ?? {}

  let oldPath
  let newPath

  if (groups["oldPath"] || groups["newPath"]) {
    const oldP = groups["oldPath"] ?? ""
    const newP = groups["newPath"] ?? ""
    oldPath = file.replace(replaceRegex, oldP).replace("//", "/")
    newPath = file.replace(replaceRegex, newP).replace("//", "/")
  } else {
    oldPath = groups["oldPath2"] ?? ""
    newPath = groups["newPath2"] ?? ""
  }

  const newest =
    renamedFiles.find(function (element) {
      return newPath == element
    }) ?? newPath
  const old =
    renamedFiles.find(function (element) {
      return oldPath == element
    }) ?? undefined
  if (old != undefined) {
    renamedFiles.pop(newPath)
    renamedFiles[renamedFiles.indexOf(old)] = newest
  }
  return newest
}

function lookupFileInTree(tree, path) {
  const dirs = path.split("/")

  if (dirs.length < 2) {
    // We have reached the end of the tree, look for the blob
    const [file] = dirs
    const result = tree.children.find((x) => x.name === file && x.type === "blob")
    if (!result) return
    if (result.type === "tree") return undefined
    return result
  }
  const subtree = tree.children.find((x) => x.name === dirs[0])
  if (!subtree || subtree.type === "blob") return
  return lookupFileInTree(subtree, dirs.slice(1).join("/"))
}
