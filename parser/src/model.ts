export type GitObject = GitBlobObject | GitTreeObject

export interface GitBlobObject {
  type: "blob"
  hash: string
  name: string
  content: string
  noLines: number
  //              author  lines-changed
  authors: Record<string, number>
}

export interface GitTreeObject {
  type: "tree"
  hash: string
  name: string
  children: (GitTreeObject | GitBlobObject)[]
}

export interface GitCommitObject {
  hash: string
  tree: GitTreeObject
  parent: string
  parent2: string | null
  author: Person
  committer: Person
  message: string
}

export type GitCommitObjectLight = Omit<GitCommitObject, "tree"> & { tree: string }

export interface Person {
  name: string
  email: string
  timestamp: number
  timezone: string
}
