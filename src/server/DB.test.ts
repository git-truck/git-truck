import { DuckDBInstance } from "@duckdb/node-api"
import { describe, expect, it } from "vitest"
import DB from "~/server/DB"

type PersonFixture = {
  name: string
  email: string
}

type CommitFixture = {
  hash: string
  author: PersonFixture
  committerTime: number
  coauthors: PersonFixture[]
}

async function createTestDb() {
  const instance = await DuckDBInstance.create(":memory:")
  const connection = await instance.connect()
  return await new DB({ instance, connection }).init()
}

function buildCommitShareExample(committerTime: number): CommitFixture[] {
  const authorA = { name: "Author A", email: "author-a@example.com" }
  const authorB = { name: "Author B", email: "author-b@example.com" }
  const authorC = { name: "Author C", email: "author-c@example.com" }
  const commits: CommitFixture[] = []

  for (let index = 0; index < 50; index++) {
    commits.push({
      hash: `a-solo-${index}`,
      author: authorA,
      committerTime,
      coauthors: []
    })
  }

  for (let index = 0; index < 50; index++) {
    commits.push({
      hash: `a-with-c-${index}`,
      author: authorA,
      committerTime,
      coauthors: [authorC]
    })
  }

  for (let index = 0; index < 50; index++) {
    commits.push({
      hash: `b-solo-${index}`,
      author: authorB,
      committerTime,
      coauthors: []
    })
  }

  for (let index = 0; index < 50; index++) {
    commits.push({
      hash: `b-with-c-${index}`,
      author: authorB,
      committerTime,
      coauthors: [authorC]
    })
  }

  return commits
}

async function insertCommits(db: DB, commits: CommitFixture[]) {
  const changedFilePath = "repo/file.ts"

  await db.usingTableAppender("commits", async (appender) => {
    for (const commit of commits) {
      appender.appendVarchar(commit.hash)
      appender.appendVarchar(commit.author.name)
      appender.appendVarchar(commit.author.email)
      appender.appendUInteger(commit.committerTime)
      appender.appendUInteger(commit.committerTime)
      appender.appendVarchar(`${commit.hash}-parent`)
      appender.appendNull()
      appender.endRow()
    }
  })

  await db.usingTableAppender("commitTrailers", async (appender) => {
    for (const commit of commits) {
      for (const coauthor of commit.coauthors) {
        appender.appendVarchar(commit.hash)
        appender.appendVarchar(coauthor.name)
        appender.appendVarchar(coauthor.email)
        appender.appendVarchar("coauthor")
        appender.endRow()
      }
    }
  })

  await db.usingTableAppender("fileChanges", async (appender) => {
    for (const commit of commits) {
      appender.appendVarchar(commit.hash)
      appender.appendUInteger(1)
      appender.appendUInteger(0)
      appender.appendVarchar(changedFilePath)
      appender.endRow()
    }
  })
}

describe("getCommitCountPerTime", () => {
  it("should split commit share evenly between authors and co-authors when co-authors are included", async () => {
    const db = await createTestDb()
    const dayStart = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000
    const committerTime = Date.UTC(2024, 0, 1, 12, 0, 0) / 1000
    const dayEnd = Date.UTC(2024, 0, 1, 23, 59, 59) / 1000

    try {
      await insertCommits(db, buildCommitShareExample(committerTime))

      const [primaryAuthorIntervals] = await db.getCommitCountPerTime([dayStart, dayEnd], "day")
      const [commitShareIntervals] = await db.getCommitCountPerTime([dayStart, dayEnd], "day", {
        includeCoauthors: true
      })

      expect(primaryAuthorIntervals[0].count).toBe(200)
      expect(primaryAuthorIntervals[0].contributors).toEqual({
        "Author A": 100,
        "Author B": 100
      })

      expect(commitShareIntervals[0].count).toBeCloseTo(200)
      expect(commitShareIntervals[0].contributors["Author A"]).toBeCloseTo(75)
      expect(commitShareIntervals[0].contributors["Author B"]).toBeCloseTo(75)
      expect(commitShareIntervals[0].contributors["Author C"]).toBeCloseTo(50)
    } finally {
      await db.close()
    }
  })

  it("should split commit share for clicked object intervals when co-authors are included", async () => {
    const db = await createTestDb()
    const dayStart = Date.UTC(2024, 0, 1, 0, 0, 0) / 1000
    const committerTime = Date.UTC(2024, 0, 1, 12, 0, 0) / 1000
    const dayEnd = Date.UTC(2024, 0, 1, 23, 59, 59) / 1000

    try {
      await insertCommits(db, buildCommitShareExample(committerTime))

      const primaryAuthorIntervals = await db.getCommitCountPerTimeForClickedObject({
        timerange: [dayStart, dayEnd],
        timeUnit: "day",
        objectPath: "repo/file.ts"
      })
      const commitShareIntervals = await db.getCommitCountPerTimeForClickedObject({
        timerange: [dayStart, dayEnd],
        timeUnit: "day",
        objectPath: "repo/file.ts",
        includeCoauthors: true
      })

      expect(primaryAuthorIntervals[0].count).toBe(200)
      expect(primaryAuthorIntervals[0].contributors).toEqual({
        "Author A": 100,
        "Author B": 100
      })

      expect(commitShareIntervals[0].count).toBeCloseTo(200)
      expect(commitShareIntervals[0].contributors["Author A"]).toBeCloseTo(75)
      expect(commitShareIntervals[0].contributors["Author B"]).toBeCloseTo(75)
      expect(commitShareIntervals[0].contributors["Author C"]).toBeCloseTo(50)
    } finally {
      await db.close()
    }
  })
})
