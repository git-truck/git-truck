import { AuthorshipType } from "~/metrics"
import { ANALYZER_CACHE_MISS_REASONS } from "./git-caller.server"

export interface Repository {
  path: string
  name: string
  data: AnalyzerData | null
  currentHead: string
  refs: GitRefs
  reasons: ANALYZER_CACHE_MISS_REASONS[]
  analyzedBranches: Record<string, string>
}

export interface GitBaseObject {
  type: "blob" | "tree" | "commit"
  hash: string
}

export interface TruckUserConfig {
  log?: string
  branch?: string
  out?: string
  path?: string
  unionedAuthors?: string[][]
  hiddenFiles?: string[]
  invalidateCache?: boolean
}

export interface TruckConfig {
  log?: string
  out?: string
  branch?: string
  path: string
  unionedAuthors: string[][]
  hiddenFiles: string[]
  invalidateCache: boolean
}

// Bump this if changes are made to this file
export const AnalyzerDataInterfaceVersion = 7

export interface AnalyzerData {
  refs: GitRefs
  cached: boolean
  interfaceVersion: typeof AnalyzerDataInterfaceVersion
  hiddenFiles: string[]
  repo: string
  branch: string
  commit: GitCommitObject
  authors: string[]
  authorUnions: string[][]
  currentVersion: string
  latestVersion?: string
  lastRunEpoch: number
  hasUnstagedChanges: boolean
}

export interface GitRefs {
  heads: Record<string, string>
  remotes: Record<string, string>
  tags: Record<string, string>
}

export interface GitBlobObject extends GitBaseObject {
  type: "blob"
  name: string
  path: string
  sizeInBytes: number
  blameAuthors: Record<string, number>
  authors: Record<string, number>
  noCommits: number
  lastChangeEpoch?: number
  isBinary?: boolean
  unionedAuthors?: Map<AuthorshipType, Record<string, number>>
  dominantAuthor?: Map<AuthorshipType, [string, number]>
  isSearchResult?: boolean
}

export type GitObject = GitBlobObject | GitTreeObject

export interface GitTreeObject extends GitBaseObject {
  type: "tree"
  name: string
  path: string
  children: (GitTreeObject | GitBlobObject)[]
  isSearchResult?: boolean
}

export interface GitCommitObject extends GitBaseObject {
  type: "commit"
  parent: string
  parent2: string | null
  author: PersonWithTime
  committer: PersonWithTime
  message: string
  description: string
  coauthors: Person[]
  tree: GitTreeObject
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
