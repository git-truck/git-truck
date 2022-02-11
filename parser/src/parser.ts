import { unzip as unzipSync } from 'zlib';
import { promises as fs } from 'fs'
import { promisify } from 'util';
import path from "path"

// const unzip = promisify(unzipSync)
const unzip = promisify(unzipSync)

export async function deflateGitObject(path: string) {
  const buffer = await fs.readFile(path)
  const res = await unzip(buffer)
  return res.toString()
}

export async function lookupAndDecompressFromHash(repo: string, hash: string) {
  const result = await deflateGitObject(path.join(repo, ".git", "objects", hash.substring(0, 2), hash.substring(2)))
  return result
}

export async function parseGitObjects(directory: string) {
  const gitObjectsPath = path.join(directory, ".git/objects")

  let folderPaths = await fs.readdir(gitObjectsPath)
  const gitObjects = new Map<string, string>()

  for (let folder of folderPaths) {
    const dir = gitObjectsPath + "/" + folder
    const fileNames = await fs.readdir(dir)
    for (let fileName of fileNames) {
      const hash = folder + fileName
      const rawObject = await deflateGitObject(path.join(dir, fileName))


      gitObjects.set(hash, rawObject)
    }
  }
  return gitObjects
}

