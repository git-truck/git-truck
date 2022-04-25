import { AnalyzerData, GitBlobObject, GitTreeObject } from "~/analyzer/model"
import { AuthorshipType } from "./metrics"

export const makeDupeMap = (authors: string[][]) => {
  const dupeMap = new Map<string, string>()
  for (const aliases of authors) {
    for (const alias of aliases) {
      dupeMap.set(alias, aliases[0])
    }
  }
  return dupeMap
}

export function unionAuthors(authors: Record<string, number>, authorAliasMap: Map<string, string>) {
  return Object.entries(authors).reduce<GitBlobObject["authors"]>(
    (newAuthorObject, [authorOrAlias, contributionCount]) => {
      // Lookup the author in the dupe list
      const author = authorAliasMap.get(authorOrAlias)

      // If the author is in the dupe list
      if (author) {
        const credits = (newAuthorObject[author] ?? 0) + contributionCount
        return {
          ...newAuthorObject,
          [author]: credits,
        }
      }

      return { ...newAuthorObject, [authorOrAlias]: contributionCount }
    },
    {}
  )
}

export function addAuthorUnion(data: AnalyzerData) {
  const authorUnions = makeDupeMap(data.authorUnions)
  addAuthorUnionRec(data.commit.tree, authorUnions)
  return authorUnions
}

function addAuthorUnionRec(tree: GitTreeObject, authorUnions: Map<string, string>) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.unionedAuthors = new Map<AuthorshipType, Record<string, number>>()
      child.unionedAuthors.set("HISTORICAL", unionAuthors(child.authors, authorUnions))
      child.unionedAuthors.set("BLAME", unionAuthors(child.blameAuthors, authorUnions))
    } else {
      addAuthorUnionRec(child, authorUnions)
    }
  }
}

export function calculateAuthorshipForSubTree(tree: GitTreeObject, authorshipType: AuthorshipType) {
  const aggregatedAuthors: Record<string, number> = {}
  subTree(tree)
  function subTree(tree: GitTreeObject) {
    for (const child of tree.children) {
      if (child.type === "blob") {
        if (child.isBinary) continue
        const unionedAuthors = child.unionedAuthors?.get(authorshipType)
        if (!unionedAuthors) throw Error("No unioned authors")
        for (const [author, contrib] of Object.entries(unionedAuthors)) {
          aggregatedAuthors[author] = (aggregatedAuthors[author] ?? 0) + contrib
        }
      } else if (child.type === "tree") {
        subTree(child)
      }
    }
  }
  return aggregatedAuthors
}
