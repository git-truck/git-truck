import { makeDupeMap, unionAuthors } from "./authorUnionUtil"
import { HydratedGitBlobObject } from "~/analyzer/model"

const authorUnions = [["author1", "author1Dupe"]]
const authorUnionsTwo = [
  ["joglr", "Jonas Glerup Røssum", "Jonas Røssum"],
  ["tjomson", "Thomas Hoffmann Kilbak", "Thomas Kilbak"],
  ["hojelse", "Kristoffer Højelse"],
  ["emiljapelt", "Emil Jäpelt"],
]

const makeHydratedGitBlobObject: () => HydratedGitBlobObject = () => ({
  noLines: 0,
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

function sumContributions(authors: HydratedGitBlobObject["authors"]) {
  return Object.values(authors).reduce((a, b) => a + b, 0)
}

describe("unionAuthors", () => {
  it("merges authors properly", () => {
    const hydratedGitBlobObject = makeHydratedGitBlobObject()
    const authors = unionAuthors(
      hydratedGitBlobObject.authors,
      makeDupeMap(authorUnions)
    )
    expect(authors.author1).toEqual(50)
    expect(authors.author2).toEqual(50)
    expect(authors.author1Dupe).toBeUndefined()
  })

  it("still merges authors properly", () => {
    const parseTS: HydratedGitBlobObject = {
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
      noLines: 249,
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
    const hydratedGitBlobObject = makeHydratedGitBlobObject()
    const sumBefore = sumContributions(hydratedGitBlobObject.authors)
    const authors = unionAuthors(
      hydratedGitBlobObject.authors,
      makeDupeMap(authorUnions)
    )
    const sumAfter = sumContributions(authors)
    expect(sumBefore).toEqual(sumAfter)
  })
})
