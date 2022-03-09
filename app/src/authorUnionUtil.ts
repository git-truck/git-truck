import {
  HydratedGitBlobObject,
  HydratedGitTreeObject,
} from "../../parser/src/model"

function unionAuthors(blob: HydratedGitBlobObject, authorUnions: string[][]) {
  return Object.entries(blob.authors).reduce(
    (newAuthorOject, [author, contributionCount]) => {
      const authors = authorUnions.find((x) => x.includes(author))

      const [name] = authors ?? [author]
      delete newAuthorOject[author]
      newAuthorOject[name] = newAuthorOject[name] || 0
      newAuthorOject[name] += contributionCount
      return newAuthorOject
    },
    blob.authors
  )
}

export function addAuthorUnion(
  tree: HydratedGitTreeObject,
  authorUnions: string[][]
) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.unionedAuthors = unionAuthors(child, authorUnions)
    } else {
      addAuthorUnion(child, authorUnions)
    }
  }
}
