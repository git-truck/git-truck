export type GitObject = GitBlobObject | GitTreeObject

export interface GitBaseObject {
  type : "blob" | "tree"
  hash : string
  name : string
  path : string
}

export interface GitBlobObject extends GitBaseObject {
  type: "blob"
  content: string
}

export interface HydratedGitBlobObject extends GitBlobObject {
  noLines: number, 
  authors: Record<string, number>, 
  noCommits: number;
}

export interface GitTreeObject extends GitBaseObject {
  type: "tree"
  children: (GitTreeObject | GitBlobObject)[]
}

export interface HydratedGitTreeObject extends Omit<GitTreeObject, "children"> {
  children: (HydratedGitTreeObject | HydratedGitBlobObject)[];
}

export interface GitCommitObject {
  hash: string
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
}

export type GitCommitObjectLight = Omit<GitCommitObject, "tree"> & { tree: string }

export interface Person {
  name: string
  email: string
}

export type PersonWithTime = Person & {
  timestamp: number
  timezone: string
}
