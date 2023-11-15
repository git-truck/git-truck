import type { AuthorshipType } from "~/metrics/metrics"
import type { ANALYZER_CACHE_MISS_REASONS } from "./git-caller.server"
import type { Mutex } from "async-mutex"

export interface Repository {
  path: string
  name: string
  data: UnfinishedAnalyzerData | null
  currentHead: string
  refs: GitRefs
  reasons: ANALYZER_CACHE_MISS_REASONS[]
  analyzedHeads: Record<string, boolean>
}

export type GitObject = GitBlobObject | GitTreeObject

export interface AbstractGitObject {
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
export const AnalyzerDataInterfaceVersion = 14

export interface FinishedAnalyzerData extends UnfinishedAnalyzerData {
  authors: string[]
  commit: HydratedGitCommitObject
  authorsUnion: string[]
  commits: Record<string, GitLogEntry>
  hydrationFinished: true
}

export interface UnfinishedAnalyzerData {
  repo: string
  branch: string
  hiddenFiles: string[]
  cached: boolean
  interfaceVersion: typeof AnalyzerDataInterfaceVersion
  commit: GitCommitObject
  lastRunEpoch: number
  currentVersion: string
}

type RefType = "Branches" | "Tags"

export type GitRefs = Record<RefType, Record<string, string>>

export interface GitBlobObject extends AbstractGitObject {
  type: "blob"
  name: string
  path: string
  sizeInBytes: number
  blameAuthors: Record<string, number>
  mutex: Mutex | undefined
}



export type HydratedGitObject = HydratedGitBlobObject | HydratedGitTreeObject

export interface HydratedGitBlobObject extends GitBlobObject {
  authors: Record<string, number>
  noCommits: number
  lastChangeEpoch?: number
  isBinary?: boolean
  unionedAuthors?: Record<AuthorshipType, Record<string, number>>
  dominantAuthor?: Record<AuthorshipType, [string, number]>
  isSearchResult?: boolean
  commits?: {hash: string, time: number}[]
  commitsNoTime?: string[]
}

export interface GitTreeObject extends AbstractGitObject {
  type: "tree"
  name: string
  path: string
  children: (GitTreeObject | GitBlobObject)[]
}

export interface HydratedGitTreeObject extends Omit<GitTreeObject, "children"> {
  children: (HydratedGitTreeObject | HydratedGitBlobObject)[]
  isSearchResult?: boolean
}

export interface GitCommitObject extends AbstractGitObject {
  type: "commit"
  tree: GitTreeObject
  parent: string
  parent2: string | null
  author: PersonWithTime
  committer: PersonWithTime
  message: string
  description: string
  coauthors: Person[]
  fileCount?: number
}

export interface HydratedGitCommitObject extends Omit<GitCommitObject, "tree"> {
  tree: HydratedGitTreeObject
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

export interface FileChange {
  path: string
  isBinary: boolean
  contribs: number
}

export interface GitLogEntry {
  author: string
  time: number
  body: string
  message: string
  hash: string
  coauthors: Person[]
  fileChanges: FileChange[]
}
