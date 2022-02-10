
export type GitObject = GitBlobObject | GitTreeObject

interface Circle {
  x: number
  y: number
  r: number
}

export interface GitBlobObject extends Circle {
  hash: string;
  name: string;
  content: string;
}

export interface GitTreeObject extends Circle {
  hash: string;
  name: string;
  children: GitObject[];
}
