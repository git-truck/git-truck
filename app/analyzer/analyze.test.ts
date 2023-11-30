import { getCoAuthors } from "./coauthors.server"

describe("getCoAuthors", () => {
  it("Should return none", () => {
    const actual = getCoAuthors("lorem ipsum\n\nCo-authored-by:")
    expect(actual.length).toBe(0)
  })

  it("Should return none when empty input", () => {
    const actual = getCoAuthors("")
    expect(actual.length).toBe(0)
  })

  it("Should return 2 authors", () => {
    const sampleDescription =
      "did some stuff\n\nCo-authored-by: Bob Bobby <bob@example.com>\nCo-authored-by: Alice Lmao <alice@example.com>"
    const expected = [
      {
        name: "Bob Bobby",
        email: "bob@example.com"
      },
      {
        name: "Alice Lmao",
        email: "alice@example.com"
      }
    ]
    const actual = getCoAuthors(sampleDescription)
    expect(actual).toStrictEqual(expected)
  })
})
