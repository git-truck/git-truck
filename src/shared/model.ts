export type Repository = {
  /**
   * Relative path to the base directory that Git Truck was started in
   */
  repositoryPath: string
  /**
   * Full path to the repository
   */
  // fullPath: string // TODO: Implement browsing, requires new routing
  /**
   * Full path to the parent directory of the repository
   */
  parentDirPath: string
  /**
   * Directory name of the parent directory of the repository
   */
  parentDirName: string
  /**
   * Directory name of the repository
   */
  repositoryName: string
} & (
  | {
      status: "Success"
      isAnalyzed: true
      refs: GitRefs
      currentHead: string
      lastChanged: number
    }
  | {
      name: string
      // fullPath: string // TODO: Implement browsing, requires new routing
      status: "Loading"
      lastChanged: number
    }
  | {
      status: "Success"
      isAnalyzed: false
      refs: GitRefs
      currentHead: string
      lastChanged: number
    }
  | {
      status: "Error"
      errorMessage: string
      lastChanged: number
    }
)

export type GitObject = GitBlobObject | GitTreeObject

export interface AbstractGitObject {
  type: "blob" | "tree" | "commit"
  hash: string
}

type RawGitObjectType = "blob" | "tree" | "commit" | "tag"
export type RawGitObject = {
  hash: string
  type: RawGitObjectType
  path: string
  value?: string
  size?: number
}

export interface ArgsOptions {
  log?: string
  out?: string
  branch?: string
  path: string
}

export interface AnalyzerData {
  cached: boolean
  hiddenFiles: string[]
  repo: string
  repositoryPath: string
  branch: string
  commit: GitCommitObject
  contributors: string[]
  currentVersion: string
  lastRunEpoch: number
  commits: Record<string, GitLogEntry>
}

type RefType = "Branches" | "Tags"

export type GitRefs = Record<RefType, Record<string, string>>

export interface GitBlobObject extends AbstractGitObject {
  type: "blob"
  name: string
  path: string
  extension: string
  sizeInBytes: number
}

export interface GitTreeObject extends AbstractGitObject {
  type: "tree"
  name: string
  path: string
  children: (GitTreeObject | GitBlobObject)[]
}

interface GitCommitObject extends AbstractGitObject {
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

export interface Person {
  name: string
  email: string
}

type PersonWithTime = Person & {
  timestamp: number
  timezone: string
}

export type ContributorGroup = {
  displayName: string
  members: Person[]
}

type ModeType = "create" | "modify" | "delete"

export interface FileChange {
  path: string
  isBinary: boolean
  insertions: number
  deletions: number
  mode: ModeType
}

export interface CommitDTO {
  author: Person
  committerTime: number
  authorTime: number
  hash: string
}

export interface CompletedResult {
  repo: string
  branch: string
  hash: string
  time: number
}

export interface FullCommitDTO extends CommitDTO {
  body: string
  message: string
  coauthors: Person[]
  fileChanges: FileChange[]
}

export interface GitLogEntry extends CommitDTO {
  coauthors: Person[]
  fileChanges: FileChange[]
}

export interface RenameEntry {
  fromName: string | null
  toName: string | null
  timestamp: number
  timestampAuthor: number
  timestampEnd?: number
}

export interface RenameInterval {
  fromName: string | null
  toName: string | null
  timestamp: number
  timestampEnd: number
}

export interface FileModification {
  path: string
  timestamp: number
  timestampAuthor: number
  type: ModeType
}

export interface RepoData {
  repo: Repository
  databaseInfo: DatabaseInfo
}

export interface DatabaseInfo {
  topContributors: Record<string, { contributor: string; contribcount: number; hasTie: boolean }>
  commitCounts: Record<string, number>
  fileSizes: Record<string, number>
  lastChanged: Record<string, number>
  contributorCounts: Record<string, number>
  maxCommitCount: number
  minCommitCount: number
  newestChangeDate: number
  oldestChangeDate: number
  maxFileSize: number
  minFileSize: number
  contributors: Person[]
  contributorGroups: ContributorGroup[]
  fileTree: GitTreeObject
  hiddenFiles: string[]
  lastRunInfo: { time: number; hash: string }
  fileCount: number
  repo: string
  branch: string
  timerange: [number, number]
  colorSeed: string | null
  contributorColors: Record<string, `#${string}`>
  commitCountPerTimeInterval: { date: string; count: number; timestamp: number }[]
  commitCountPerTimeIntervalUnit: "day" | "week" | "month" | "year"
  selectedRange: [number, number]
  analyzedRepos: CompletedResult[]
  contribSumPerFile: Record<string, number>
  contributorsForPath: Record<string, { contributor: string; contribcount: number }[]>
  maxMinContribCounts: { max: number; min: number }
  commitCount: number
}

export type HexColor = `#${string}`
