export const emptyGitCommitHash = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
export const gitLogRegex =
  /"author\s+<\|(?<author>.+?)\|>\s+date\s+<\|(?<date>\d+)\|>\s+message\s+<\|(?<message>(?:.|\s)+?)\|>\s+body\s+<\|(?<body>(?:.|\s)*?)\|>\s+hash\s+<\|(?<hash>.+?)\|>"\s*(?<contributions>(?:\s*.+\s+\|.*)+)?/gm
export const contribRegex = /(?<file>.*?)\s*\|\s*((?<contribs>\d+)|(?<bin>Bin)).*/gm

export const OPTIONS_LOCAL_STORAGE_KEY = "options"
