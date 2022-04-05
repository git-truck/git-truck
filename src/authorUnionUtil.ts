import {
  HydratedGitBlobObject,
  HydratedGitTreeObject,
} from "~/analyzer/model"
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

export function unionAuthors(
  authors: Record<string, number>,
  authorAliasMap: Map<string, string>
) {
  return Object.entries(authors).reduce<HydratedGitBlobObject["authors"]>(
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

export function addAuthorUnion(
  tree: HydratedGitTreeObject,
  authorUnions: Map<string, string>
) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.unionedAuthors = new Map<AuthorshipType, Record<string, number>>()
      child.unionedAuthors.set("HISTORICAL", unionAuthors(child.authors, authorUnions))
      child.unionedAuthors.set("BLAME", unionAuthors(child.blameAuthors, authorUnions))
    } else {
      addAuthorUnion(child, authorUnions)
    }
  }
}

export function calculateAuthorshipForSubTree(tree: HydratedGitTreeObject, baseDataType: AuthorshipType) {
  const aggregatedAuthors: Record<string, number> = {}
  subTree(tree)
  function subTree(tree: HydratedGitTreeObject) {
      for (const child of tree.children) {
          if (child.type === "blob") {
              if (!child.unionedAuthors?.get(baseDataType)) throw Error("No unioned authors")
              for (const [author, contrib] of Object.entries(child.unionedAuthors?.get(baseDataType) ?? {})) {
                  aggregatedAuthors[author] = (aggregatedAuthors[author] ?? 0) + contrib
              }
          } else if (child.type === "tree") {
              subTree(child)
          }
      }
  }
  return aggregatedAuthors
}
