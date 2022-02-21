import fsSync, { promises as fs } from "fs"
import { GitBlobObject, GitCommitObject, GitCommitObjectLight, GitTreeObject, Person } from "./model.js"
import { log } from "./log.js"
import { describeAsyncJob, formatMs, writeRepoToFile, getCurrentBranch, getRepoName, deflateGitObject } from "./util.js"
import { emptyGitTree } from "./constants.js"
import { join } from "path"
import TruckIgnore from "./TruckIgnore.js"
import { resolve } from "path";
import { performance } from "perf_hooks";
import yargsParser from "yargs-parser";
import { hydrateTreeWithAuthorship } from "./hydrate.js";

export async function findBranchHead(repo: string, branch: string | null) {
  if (branch === null) branch = (await getCurrentBranch(repo))

  const gitFolder = join(repo, ".git")
  if (!(fsSync.existsSync(gitFolder))) {

    throw Error(`${repo} is not a git repository`)
  }
  // Find file containing the branch head
  const branchPath = join(gitFolder, "refs/heads/" + branch)
  const absolutePath = join(process.cwd(), branchPath)
  log.debug("Looking for branch head at " + absolutePath)

  const branchHead = (await fs.readFile(branchPath, "utf-8")).trim()
  log.debug(`${branch} -> [commit]${branchHead}`)

  return [branchHead, branch]
}

export async function parseCommitLight(repo: string, hash: string): Promise<GitCommitObjectLight> {
  const commitRegex = /^tree (?<tree>.*)\n(?:parent (?<parent>.*)\n)?(?:parent (?<parent2>.*)\n)?author (?<authorName>.*) <(?<authorEmail>.*)> (?<authorTimeStamp>\d*) (?<authorTimeZone>.*)\ncommitter (?<committerName>.*) <(?<committerEmail>.*)> (?<committerTimeStamp>\d*) (?<committerTimeZone>.*)\n(?:gpgsig (?:.|\n)*-----END PGP SIGNATURE-----)?\n*(?<message>.*)\n*(?<description>(.|\n|\r)*)/g;
  const rawContent = await deflateGitObject(repo, hash)
  const match = commitRegex.exec(rawContent)
  let groups = match?.groups ?? {}

  let tree = groups["tree"]
  let parent = groups["parent"] ?? emptyGitTree
  let parent2 = groups["parent2"] ?? null
  let author = {
    name: groups["authorName"],
    email: groups["authorEmail"],
    timestamp: Number(groups["authorTimeStamp"]),
    timezone: groups["authorTimeZone"]
  }
  let committer = {
    name: groups["committerName"],
    email: groups["committerEmail"],
    timestamp: Number(groups["committerTimeStamp"]),
    timezone: groups["committerTimeZone"]
  }
  let message = groups["message"]
  let description = groups["description"]
  let coauthors = getCoAuthors(description)

  return {
    type: "commit",
    hash,
    tree,
    parent,
    parent2,
    author,
    committer,
    message,
    description,
    coauthors
  }
}

export async function parseCommit(repo: string, hash: string): Promise<GitCommitObject> {
  const { tree, ...commit } = await parseCommitLight(repo, hash)
  const truckignore = new TruckIgnore(repo)
  return {
    ...commit,
    tree: await parseTree(getRepoName(repo), repo, ".", tree, truckignore),
  }
}

function getCoAuthors(description: string) {
  let coauthorRegex = /.*Co-authored-by: (?<name>.*) <(?<email>.*)>/gm
  let coauthormatches = description.matchAll(coauthorRegex)
  let next = coauthormatches.next()
  let coauthors: Person[] = []

  while (next.value !== undefined) {
    coauthors.push(
      {
        name: next.value.groups["name"].trimEnd(),
        email: next.value.groups["email"]
      }
    )
    next = coauthormatches.next()
  }
  return coauthors
}

async function parseTree(path: string, repo: string, name: string, hash: string, truckignore: TruckIgnore): Promise<GitTreeObject> {
  const rawContent = await deflateGitObject(repo, hash)
  const entries = rawContent.split("\n").filter((x) => x.trim().length > 0)

  let children: (GitTreeObject | GitBlobObject)[] = []
  for await(let line of entries) {
    const [_, type, hash, name] = line.split(/\s+/)
    if (!truckignore.isAccepted(name)) continue
    const newPath = [path, name].join("/")
    log.debug(`Path: ${newPath}`)

    switch (type) {
      case "tree":
        children.push(await parseTree(newPath, repo, name, hash, truckignore))
        break;
      case "blob":
        children.push(await parseBlob(newPath, repo, name, hash))
        break;
      default:
        throw new Error(` type ${type}`)
    }
  }

  return {
    type: "tree",
    path: path,
    name,
    hash,
    children,
  }
}

async function parseBlob(path: string, repo: string, name: string, hash: string): Promise<GitBlobObject> {
  const content = await deflateGitObject(repo, hash)
  const blob: GitBlobObject = {
    type: "blob",
    hash,
    path,
    name,
    content,
  }
  return blob
}

export async function parse(rawArgs: string[]) {
const args = yargsParser(rawArgs)

  if (args.help || args.h) {
    console.log(`Git Visual

  Usage: npm run start -- <args>

  Options:
    --path <path to git repository> (default: current directory)
    --out <output path for json file> (default: ./.temp/{repo}_{branch}.json)
    --branch <branch name> (default: current branch)
    --help, -h: Show this help message`)
    return
  }

  const repoDir = args.path ?? ".";
  let branch = args.branch ?? null;

  const start = performance.now();
  const [branchHead, branchName] = await describeAsyncJob(
    () => findBranchHead(repoDir, branch),
    "Finding branch head",
    "Found branch head",
    "Error finding branch head"
  );
  const repoName = getRepoName(repoDir)
  const outFileName = args.out ?? `./.temp/${repoName}_${branchName}.json`;
  const repoTree = await describeAsyncJob(
    () => parseCommit(repoDir, branchHead),
    "Parsing commit tree",
    "Commit tree parsed",
    "Error parsing commit tree"
  );
  const hydratedRepoTree = await describeAsyncJob(
    () => hydrateTreeWithAuthorship(repoDir, repoTree),
    "Hydrating commit tree with authorship data",
    "Commit tree hydrated",
    "Error hydrating commit tree"
  );
  await describeAsyncJob(
    () => writeRepoToFile(hydratedRepoTree, repoName, branchName, repoDir, outFileName),
    "Writing data to file",
    `Wrote data to ${resolve(join(repoDir, outFileName))}`,
    `Error writing data to file ${outFileName}`
  );
  const stop = performance.now();

  log.log(`\nDone in ${formatMs(stop - start)}`);
}
