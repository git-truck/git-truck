import { describe, expect, it, expectTypeOf } from "vitest"

type SharedKeys<T> = keyof {
  [K in keyof T[keyof T] as T[keyof T] extends Record<K, unknown> ? K : never]: true
}

function pickKey<T extends Record<PropertyKey, Record<PropertyKey, unknown>>, K extends SharedKeys<T>>(
  obj: T,
  key: K
): { [P in keyof T]: T[P][K] } {
  const result: Partial<{ [P in keyof T]: T[P][K] }> = {}

  for (const k in obj) {
    result[k] = obj[k][key]
  }

  return result as { [P in keyof T]: T[P][K] }
}

describe("pickKey", () => {
  const Metrics = {
    commits: {
      name: "Commits",
      icon: "mdiSourceCommit",
      color: "blue",
      unit: "commits"
    },
    lineChanges: {
      name: "Line Changes",
      icon: "mdiFileDocumentEdit",
      color: "orange",
      aggregation: "sum"
    },
    contributors: {
      name: "Contributors",
      icon: "mdiAccountGroup",
      color: "green",
      limit: 10
    }
  }

  it("plucks shared metric metadata", () => {
    expect(pickKey(Metrics, "icon")).toEqual({
      commits: "mdiSourceCommit",
      lineChanges: "mdiFileDocumentEdit",
      contributors: "mdiAccountGroup"
    })

    expect(pickKey(Metrics, "name")).toEqual({
      commits: "Commits",
      lineChanges: "Line Changes",
      contributors: "Contributors"
    })

    expect(pickKey(Metrics, "color")).toEqual({
      commits: "blue",
      lineChanges: "orange",
      contributors: "green"
    })
  })

  it("infers the correct type for shared metric fields", () => {
    const metricIcons = pickKey(Metrics, "icon")
    const metricNames = pickKey(Metrics, "name")

    expectTypeOf(metricIcons).toEqualTypeOf<{
      commits: string
      lineChanges: string
      contributors: string
    }>()

    expectTypeOf(metricNames).toEqualTypeOf<{
      commits: string
      lineChanges: string
      contributors: string
    }>()
  })

  it("only allows keys shared by every metric", () => {
    // @ts-expect-error unit only exists on commits
    pickKey(Metrics, "unit")

    // @ts-expect-error aggregation only exists on lineChanges
    pickKey(Metrics, "aggregation")

    // @ts-expect-error limit only exists on contributors
    pickKey(Metrics, "limit")
  })
})
