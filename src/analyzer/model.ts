import { AuthorshipType } from "~/metrics"

export type GitObject = GitBlobObject | GitTreeObject

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
}

export interface TruckConfig {
  log?: string
  out?: string
  branch: string
  path: string
  unionedAuthors: string[][]
  hiddenFiles: string[]
}

// Bump this if AnalyzerData interface chances
export const AnalyzerDataInterfaceVersion = 3

export interface AnalyzerData {
  cached: boolean
  interfaceVersion: typeof AnalyzerDataInterfaceVersion
  hiddenFiles: string[]
  repo: string
  branch: string
  commit: HydratedGitCommitObject
  authors: string[]
  authorUnions: string[][]
  currentVersion: string
  latestVersion?: string
  lastRunEpoch: number
}

export interface GitBlobObject extends GitBaseObject {
  type: "blob"
  name: string
  path: string
  content?: string
  blameAuthors: Record<string, number>
}

export type HydratedGitObject = HydratedGitBlobObject | HydratedGitTreeObject

export interface HydratedGitBlobObject extends GitBlobObject {
  noLines: number
  authors: Record<string, number>
  noCommits: number
  lastChangeEpoch?: number
  isBinary?: boolean
  unionedAuthors?: Map<AuthorshipType, Record<string, number>>
  dominantAuthor?: Map<AuthorshipType, [string, number]>
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
