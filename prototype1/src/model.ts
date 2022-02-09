
type GitObject = GitBlobObject | GitTreeObject

export interface GitBlobObject {
  hash: string;
  name: string;
  content: string;
}

export interface GitTreeObject {
  hash: string;
  name: string;
  children: GitObject[];
}
