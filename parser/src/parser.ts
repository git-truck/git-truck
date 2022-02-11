import { unzip } from 'zlib';
import { promises as fs } from 'fs'
import { promisify } from 'util';
import  { createInterface } from "readline";
import path from "path"

export async function parseFile(path: string) {
  const buffer = await fs.readFile(path)
  const unzipPromise = promisify(unzip)
  const res = await unzipPromise(buffer)
  return res.toString()
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
      const rawObject = await parseFile(path.join(dir, fileName))


      gitObjects.set(hash, rawObject)
    }
  }
  return gitObjects
}

export async function runAsCli() {
    const io = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    io.question("Input path to directory: ", async (input) => {
        const result = await parseGitObjects(input);
        console.log(Array.from(result.entries()))
        io.close();
    });
}
