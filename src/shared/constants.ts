// NOTE: These regexes intentionally match ONLY the commit header line (the
// quoted "<|...|>" / "parents <|...|> ..." portion). They used to also embed
// a repeated capturing group that swallowed every numstat/summary line until
// the next commit (e.g. `(?:(?:\d+|-)\s+(?:\d+|-)\s+.+\s?)*`). For repositories
// with hundreds of thousands of commits (or commits touching thousands of
// files), that repeated capturing group caused V8's regex engine to recurse
// once per matched line within a single match, throwing
// `RangeError: Maximum call stack size exceeded`.
//
// Callers must instead find all header matches first, then slice the raw git
// log output between one header's end and the next header's start to get the
// per-commit numstat/summary section, and run `contribRegex`/`modeRegex`
// (which are bounded, per-line patterns) against that bounded slice.
export const gitLogRegex =
  /"parents\s+<\|(?<parents>.*?)\|>\s+author\s+<\|(?<author>.*?)\|>\s+email\s+<\|(?<authorEmail>.*?)\|>\s+date\s+<\|(?<dateCommitter>\d+)\s(?<dateAuthor>\d+)\|>\s+message\s+<\|(?<message>[\s\S]*?)\|>\s+body\s+<\|(?<body>[\s\S]*?)\|>\s+hash\s+<\|(?<hash>.+?)\|>"/gmu
export const gitLogRegexSimple =
  /"<\|(?<parents>.*?)\|><\|(?<author>.*?)\|><\|(?<authorEmail>.*?)\|><\|(?<dateCommitter>\d+)\s(?<dateAuthor>\d+)\|>\s*<\|(?<trailers>[\s\S]*?)\|><\|(?<hash>.+?)\|>"/gmu
export const contribRegex = /(?<insertions>\d+|-)\s+(?<deletions>\d+|-)\s+(?<file>.+)/gm
export const treeRegex = /^\S+? (?<type>\S+) (?<hash>\S+)\s+(?<size>\S+)\s+(?<path>.+)/gm
export const modeRegex = /\s(?<mode>\w+)\s\w+\s\d+\s(?<file>.+)/gmu
export const OPTIONS_LOCAL_STORAGE_KEY = "options"
