import { unzip } from 'zlib';
import { readFileSync, readdirSync } from 'fs'
import { promisify } from 'util';
import  { createInterface } from "readline";

export async function parseFile(path: string) {
    const buffer = readFileSync(path);
    const unzipPromise = promisify(unzip);
    const res = await unzipPromise(buffer);
    return res.toString();
}

export async function parseGitObjects(directory: string) {
    const gitObjects = new Map<string, string>();
    const gitObjectsPath = directory + '/.git/objects'

    let entries = readdirSync(gitObjectsPath);
    entries = entries.filter(entry => entry !== "pack" && entry !== "info");

    entries.forEach(entry => {
        const dir = gitObjectsPath + "/" + entry
        const fileNames = readdirSync(dir);
        Promise.all(fileNames.map(async fileName => {
            const fileContent = await parseFile(dir + "/" + fileName);
            console.log(fileContent);
            gitObjects.set(entry + fileName, fileContent);
        }));

    });
    console.log(gitObjects);
}

export async function runAsCli() {
    const io = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    io.question("Input path to directory: ", (input) => {
        parseGitObjects(input);
        io.close();
    });
}
