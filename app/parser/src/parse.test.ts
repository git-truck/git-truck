import { exportForTest } from "./parse.server"
jest.mock("./TruckIgnore")
jest.setTimeout(15000)

describe("getCoAuthors", () => {
  it("Should return none", () => {
    const actual = exportForTest.getCoAuthors("lorem ipsum\n\nCo-authored-by:")
    expect(actual.length).toBe(0)
  })

  it("Should return none when empty input", () => {
    const actual = exportForTest.getCoAuthors("")
    expect(actual.length).toBe(0)
  })

  it("Should return 2 authors", () => {
    const sampleDescription =
      "did some stuff\n\nCo-authored-by: Bob Bobby <bob@example.com>\nCo-authored-by: Alice Lmao <alice@example.com>"
    const expected = [
      {
        name: "Bob Bobby",
        email: "bob@example.com",
      },
      {
        name: "Alice Lmao",
        email: "alice@example.com",
      },
    ]
    const actual = exportForTest.getCoAuthors(sampleDescription)
    expect(actual).toStrictEqual(expected)
  })
})
