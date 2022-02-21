import { last } from "./util"

describe("last", () => {
  it("gets the last element of the array", () => {
    const arr = [1, 2, 3, 4, 5]
    expect(last(arr)).toBe(5)
  })
})
