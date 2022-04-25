import { makeDupeMap, unionAuthors } from "./authorUnionUtil"
import { GitBlobObject } from "~/analyzer/model"

const authorUnions = [["author1", "author1Dupe"]]
const authorUnionsTwo = [
  ["joglr", "Jonas Glerup Røssum", "Jonas Røssum"],
  ["tjomson", "Thomas Hoffmann Kilbak", "Thomas Kilbak"],
  ["hojelse", "Kristoffer Højelse"],
  ["emiljapelt", "Emil Jäpelt"],
]

const makeGitBlobObject: () => GitBlobObject = () => ({
  sizeInBytes: 0,
  authors: {
    author1Dupe: 25,
    author2: 50,
    author1: 25,
  },
  blameAuthors: {},
  noCommits: 0,
  type: "blob",
  name: "",
  path: "",
  content: undefined,
  hash: "",
})

function sumContributions(authors: GitBlobObject["authors"]) {
  return Object.values(authors).reduce((a, b) => a + b, 0)
}

describe("unionAuthors", () => {
  it("merges authors properly", () => {
    const gitBlobObject = makeGitBlobObject()
    const authors = unionAuthors(gitBlobObject.authors, makeDupeMap(authorUnions))
    expect(authors.author1).toEqual(50)
    expect(authors.author2).toEqual(50)
    expect(authors.author1Dupe).toBeUndefined()
  })

  it("still merges authors properly", () => {
    const parseTS: GitBlobObject = {
      type: "blob",
      hash: "2c701dc4ef5141fc8bc6db347fa2e0a44aec6c99",
      path: "git-visual/parser/src/parse.ts",
      name: "parse.ts",
      authors: {
        "Thomas Hoffmann Kilbak": 159,
        "Jonas Glerup Røssum": 142,
        "Kristoffer Højelse": 21,
        tjomson: 19,
        emiljapelt: 40,
        joglr: 40,
        "Jonas Røssum": 125,
      },
      blameAuthors: {},
      sizeInBytes: 249,
      noCommits: 30,
      lastChangeEpoch: 1646818775,
    }
    const sumBefore = sumContributions(parseTS.authors)
    const authors = unionAuthors(parseTS.authors, makeDupeMap(authorUnionsTwo))

    expect(authors.joglr).toEqual(307) // Calculated by hand
    expect(authors.tjomson).toEqual(178)
    expect(authors.emiljapelt).toEqual(40)
    expect(authors.hojelse).toEqual(21)
    expect(sumContributions(authors)).toEqual(sumBefore)
  })

  it("the sum is the same before and after union", () => {
    const gitBlobObject = makeGitBlobObject()
    const sumBefore = sumContributions(gitBlobObject.authors)
    const authors = unionAuthors(gitBlobObject.authors, makeDupeMap(authorUnions))
    const sumAfter = sumContributions(authors)
    expect(sumBefore).toEqual(sumAfter)
  })
})
