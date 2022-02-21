import { HydratedGitBlobObject } from "../../parser/src/model"
import { users } from "./const"

export function unionAuthors(blob: HydratedGitBlobObject) {
    return Object.entries(blob.authors).reduce((newAuthorOject, [author, contributionCount]) => {
        const authors = users.find((x) => x.includes(author))
        if (!authors) throw Error("Author not found: " + author)
        const [name] = authors
        delete newAuthorOject[author]
        newAuthorOject[name] = newAuthorOject[name] || 0
        newAuthorOject[name] += contributionCount
        return newAuthorOject
    }, blob.authors)
}
