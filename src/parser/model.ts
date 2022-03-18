export type GitObject = GitBlobObject | GitTreeObject

export interface GitBaseObject {
  type: "blob" | "tree" | "commit"
  hash: string
}

export interface ParserData {
  repo: string
  branch: string
  commit: HydratedGitCommitObject
  authorUnions: string[][]
}

export interface GitBlobObject extends GitBaseObject {
  type: "blob"
  name: string
  path: string
  content?: string
}

export type HydratedGitObject = HydratedGitBlobObject | HydratedGitTreeObject

export interface HydratedGitBlobObject extends GitBlobObject {
  noLines: number
  authors: Record<string, number>
  unionedAuthors?: Record<string, number>
  noCommits: number
  lastChangeEpoch?: number
  dominantAuthor?: [string, number]
  isBinary?: boolean
}

export interface GitTreeObject extends GitBaseObject {
  type: "tree"
  name: string
  path: string
  children: (GitTreeObject | GitBlobObject)[]
}

export interface HydratedGitTreeObject extends Omit<GitTreeObject, "children"> {
  children: (HydratedGitTreeObject | HydratedGitBlobObject)[]
}

export interface GitCommitObject extends GitBaseObject {
  type: "commit"
  tree: GitTreeObject
  parent: string
  parent2: string | null
  author: PersonWithTime
  committer: PersonWithTime
  message: string
  description: string
  coauthors: Person[]
}

export interface HydratedGitCommitObject extends Omit<GitCommitObject, "tree"> {
  tree: HydratedGitTreeObject
  minNoCommits: number
  maxNoCommits: number
  newestLatestChangeEpoch: number
  oldestLatestChangeEpoch: number
}

export type GitCommitObjectLight = Omit<GitCommitObject, "tree"> & {
  tree: string
}

export interface Person {
  name: string
  email: string
}

export type PersonWithTime = Person & {
  timestamp: number
  timezone: string
}
