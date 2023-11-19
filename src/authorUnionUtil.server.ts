import type { AnalyzerData, HydratedGitBlobObject, HydratedGitTreeObject } from "~/analyzer/model"

export const makeDupeMap = (authors: string[][]): Record<string, string> => {
  const dupeMap: Record<string, string> = {}
  for (const aliases of authors) {
    for (const alias of aliases) {
      dupeMap[alias] = aliases[0]
    }
  }
  return dupeMap
}

export function unionAuthors(authors: Record<string, number>, authorAliasMap: Record<string, string>) {
  return Object.entries(authors).reduce<HydratedGitBlobObject["authors"]>(
    (newAuthorObject, [authorOrAlias, contributionCount]) => {
      // Lookup the author in the dupe list
      const author = authorAliasMap[authorOrAlias]

      // If the author is in the dupe list
      if (author) {
        const credits = (newAuthorObject[author] ?? 0) + contributionCount
        return {
          ...newAuthorObject,
          [author]: credits
        }
      }

      return { ...newAuthorObject, [authorOrAlias]: contributionCount }
    },
    {}
  )
}

export function nameUnion(names: string[], authorAliasMap: Record<string, string>) {
  const collector: string[] = []
  for (const name of names) {
    const lookup = authorAliasMap[name]
    if (lookup) {
      if (collector.includes(lookup)) continue
      collector.push(lookup)
    } else collector.push(name)
  }
  return collector
}

export function addAuthorUnion(data: AnalyzerData, dupeMap: Record<string, string>) {
  data.commit.tree = addAuthorUnionRec(data.commit.tree, dupeMap)
  return data
}

function addAuthorUnionRec(tree: HydratedGitTreeObject, authorUnions: Record<string, string>) {
  for (const child of tree.children) {
    if (child.type === "blob") {
      child.unionedAuthors = {
        HISTORICAL: unionAuthors(child.authors, authorUnions)
        // BLAME: unionAuthors(child.blameAuthors, authorUnions),
      }
    } else {
      addAuthorUnionRec(child, authorUnions)
    }
  }
  return tree
}
