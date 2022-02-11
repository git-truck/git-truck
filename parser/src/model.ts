export type GitObject = GitBlobObject | GitTreeObject

export interface GitBlobObject {
  hash: string
  name: string
  content: string
}

export interface GitTreeObject {
  hash: string
  name: string
  children: GitObject[]
}

export interface GitCommitObject {
  hash: string
  tree: string
  parent: string
  author: string
  committer: string
  message: string
}

export interface Person {
  name: string
  email: string
  timestamp: number
  timezone: string
}
