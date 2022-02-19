import { readFileSync } from 'fs'
import { compile } from 'gitignore-parser'

export default class TruckIgnore {
    private truckignore
    constructor(path: string) {
        const file = readFileSync(path + "/.truckignore", 'utf-8')
        this.truckignore = compile(file)
    }

    public isAccepted(fileName: string) {
        return this.truckignore.accepts(fileName)
    }
}

