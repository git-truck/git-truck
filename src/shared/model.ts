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

export type RawGitObjectType = "blob" | "tree"

export type RawGitObject = {
  type: RawGitObjectType
  hash: string
  path: string
  name: string
  byteSize: number
}

export interface ArgsOptions {
  log?: string
  out?: string
  branch?: string
  path: string
}

type RefType = "Branches" | "Tags"

export type GitRefs = Record<RefType, Record<string, string>>

export type GitBlobObject = Omit<RawGitObject, "type"> & {
  type: "blob"
  extension: string
}

export type GitTreeObject = Omit<RawGitObject, "type"> & {
  type: "tree"
  children: (GitTreeObject | GitBlobObject)[]
}

export interface Person {
  name: string
  email: string
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
  repositoryPath: string
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
  clickedObjectInfo: {
    path: string
    existsInRange: boolean
    topContributor: {
      contributor: string
      contribs: number
    }[]
    multiTopContributors: boolean
    amountOfCommits: number
    contributors: string[]
    contributions: number
    lastChanged: number
  }
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
  objectMap: Record<string, GitObject>
  hiddenFiles: string[]
  lastRunInfo: { time: number; hash: string }
  fileCount: number
  repo: string
  branch: string
  timerange: [number, number]
  colorSeed: string | null
  contributorColors: Record<string, `#${string}`>
  commitCountPerTimeInterval: { date: string; count: number; timestamp: number }[]
  commitCountPerTimeIntervalUnit: TimeUnit
  selectedRange: [number, number]
  analyzedRepos: CompletedResult[]
  contribSumPerFile: Record<string, number>
  contributorsForPath: Record<string, { contributor: string; contribcount: number }[]>
  maxMinContribCounts: { max: number; min: number }
  commitCount: number
  selectedFileCommitTimestamps: number[]
}

export type HexColor = `#${string}`

export const TimeUnitValues = ["day", "week", "month", "year"] as const
export type TimeUnit = (typeof TimeUnitValues)[number]
