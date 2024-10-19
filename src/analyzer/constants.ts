export const emptyGitCommitHash = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
export const gitLogRegex =
  /"author\s+<\|(?<author>.*?)\|>\s+date\s+<\|(?<datecommitter>\d+)\s(?<dateauthor>\d+)\|>\s+message\s+<\|(?<message>[\s\S]*?)\|>\s+body\s+<\|(?<body>[\s\S]*?)\|>\s+hash\s+<\|(?<hash>.+?)\|>"\s*(?<contributions>(?:(?:\d+|-)\s+(?:\d+|-)\s+.+\s?)*)(?<modes>(?:\s.+\s*)*)/gmu
export const gitLogRegexSimple =
  /"<\|(?<author>.*?)\|><\|(?<datecommitter>\d+)\s(?<dateauthor>\d+)\|><\|(?<hash>.+?)\|>"\s*(?<contributions>(?:(?:\d+|-)\s+(?:\d+|-)\s+.+\s?)*)(?<modes>(?:\s.+\s*)*)/gmu
export const contribRegex = /(?<insertions>\d+|-)\s+(?<deletions>\d+|-)\s+(?<file>.+)/gm
export const treeRegex = /^\S+? (?<type>\S+) (?<hash>\S+)\s+(?<size>\S+)\s+(?<path>.+)/gm
export const modeRegex = /\s(?<mode>\w+)\s\w+\s\d+\s(?<file>.+)/gmu
export const OPTIONS_LOCAL_STORAGE_KEY = "options"
