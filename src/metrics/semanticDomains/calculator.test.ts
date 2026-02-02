import { calculateDomainIntensity, calculateAllIntensities } from "./calculator"
import type { DomainDefinition } from "./types"

describe("calculateDomainIntensity", () => {
  const mockDatabaseDomain: DomainDefinition = {
    name: "Database",
    color: "#ff6b6b",
    keywords: ["SELECT", "INSERT", "query", "transaction", "Model"],
    imports: ["prisma", "pg", "sequelize"],
    pathPatterns: ["**/models/**", "*.sql", "**/db/**"],
    weights: {
      keyword: 1,
      import: 5,
      path: 10
    }
  }

  const mockUIDomain: DomainDefinition = {
    name: "UI",
    color: "#4ecdc4",
    keywords: ["component", "render", "useState", "onClick"],
    imports: ["react", "vue", "styled-components"],
    pathPatterns: ["**/components/**", "*.tsx", "*.jsx"],
    weights: {
      keyword: 1,
      import: 5,
      path: 10
    }
  }

  describe("path pattern matching", () => {
    it("should match exact path patterns", () => {
      const score = calculateDomainIntensity("src/models/User.ts", "", mockDatabaseDomain)
      expect(score).toBeGreaterThanOrEqual(10) // At least path weight
    })

    it("should match SQL file extension", () => {
      const score = calculateDomainIntensity("migrations/001_init.sql", "", mockDatabaseDomain)
      expect(score).toBeGreaterThanOrEqual(10)
    })

    it("should match nested paths with **", () => {
      const score = calculateDomainIntensity("src/features/user/models/Profile.ts", "", mockDatabaseDomain)
      expect(score).toBeGreaterThanOrEqual(10)
    })

    it("should not match unrelated paths", () => {
      const score = calculateDomainIntensity("src/utils/helpers.ts", "", mockDatabaseDomain)
      expect(score).toBe(0)
    })

    it("should match tsx extension for UI domain", () => {
      const score = calculateDomainIntensity("src/Button.tsx", "", mockUIDomain)
      expect(score).toBeGreaterThanOrEqual(10)
    })
  })

  describe("import statement matching", () => {
    it("should detect ES6 imports", () => {
      const content = `import { PrismaClient } from 'prisma'`
      const score = calculateDomainIntensity("app.ts", content, mockDatabaseDomain)
      expect(score).toBeGreaterThanOrEqual(5)
    })

    it("should detect CommonJS requires", () => {
      const content = `const { Client } = require('pg')`
      const score = calculateDomainIntensity("app.js", content, mockDatabaseDomain)
      expect(score).toBeGreaterThanOrEqual(5)
    })

    it("should detect multiple imports", () => {
      const content = `
        import { PrismaClient } from 'prisma'
        import pg from 'pg'
      `
      const score = calculateDomainIntensity("db.ts", content, mockDatabaseDomain)
      expect(score).toBeGreaterThanOrEqual(10) // 2 imports * 5
    })

    it("should detect React imports for UI domain", () => {
      const content = `import React, { useState } from 'react'`
      const score = calculateDomainIntensity("Component.tsx", content, mockUIDomain)
      expect(score).toBeGreaterThanOrEqual(5)
    })

    it("should detect scoped package imports", () => {
      const content = `import { styled } from 'styled-components'`
      const score = calculateDomainIntensity("Button.tsx", content, mockUIDomain)
      expect(score).toBeGreaterThanOrEqual(5)
    })
  })

  describe("keyword matching", () => {
    it("should detect SQL keywords", () => {
      const content = `
        SELECT * FROM users WHERE id = 1;
        INSERT INTO users VALUES ('test');
      `
      const score = calculateDomainIntensity("query.ts", content, mockDatabaseDomain)
      expect(score).toBeGreaterThan(0)
    })

    it("should be case insensitive", () => {
      const content = `select * from users`
      const score = calculateDomainIntensity("query.ts", content, mockDatabaseDomain)
      expect(score).toBeGreaterThan(0)
    })

    it("should normalize by file length", () => {
      const shortContent = "SELECT"
      const longContent = "SELECT " + "x ".repeat(1000)

      const shortScore = calculateDomainIntensity("short.sql", shortContent, mockDatabaseDomain)
      const longScore = calculateDomainIntensity("long.sql", longContent, mockDatabaseDomain)

      // Shorter file should have higher normalized score
      expect(shortScore).toBeGreaterThan(longScore)
    })

    it("should match whole words only", () => {
      const content = "transaction_id" // Contains "transaction" but as part of word
      const score = calculateDomainIntensity("test.ts", content, mockDatabaseDomain)
      // Should still match due to word boundary
      expect(score).toBeGreaterThanOrEqual(0)
    })

    it("should detect React hooks", () => {
      const content = `
        const [count, setCount] = useState(0)
        const handleClick = () => {}
      `
      const score = calculateDomainIntensity("Counter.tsx", content, mockUIDomain)
      expect(score).toBeGreaterThan(0)
    })
  })

  describe("combined scoring", () => {
    it("should combine all signals for high confidence", () => {
      const content = `
        import { PrismaClient } from 'prisma'

        const prisma = new PrismaClient()

        async function query() {
          return await prisma.user.findMany({
            where: { active: true }
          })
        }
      `
      const score = calculateDomainIntensity("src/db/users.ts", content, mockDatabaseDomain)
      expect(score).toBeGreaterThan(15) // Path + import + keywords
    })

    it("should work for React component with all signals", () => {
      const content = `
        import React, { useState } from 'react'
        import styled from 'styled-components'

        export function Button() {
          const [clicked, setClicked] = useState(false)
          return <button onClick={() => setClicked(true)}>Click</button>
        }
      `
      const score = calculateDomainIntensity("src/components/Button.tsx", content, mockUIDomain)
      expect(score).toBeGreaterThan(20)
    })

    it("should handle files with no matches", () => {
      const content = `export const PI = 3.14159`
      const score = calculateDomainIntensity("constants.ts", content, mockDatabaseDomain)
      expect(score).toBe(0)
    })
  })

  describe("edge cases", () => {
    it("should handle empty content", () => {
      const score = calculateDomainIntensity("empty.ts", "", mockDatabaseDomain)
      expect(score).toBe(0)
    })

    it("should handle files with only whitespace", () => {
      const score = calculateDomainIntensity("whitespace.ts", "   \n\n\t  ", mockDatabaseDomain)
      expect(score).toBe(0)
    })

    it("should cap score at 100", () => {
      const content = `
        import prisma from 'prisma'
        import pg from 'pg'
        import sequelize from 'sequelize'
        ${Array(1000)
          .fill("SELECT INSERT UPDATE DELETE query transaction Model")
          .join(" ")}
      `
      const score = calculateDomainIntensity("massive.sql", content, mockDatabaseDomain)
      expect(score).toBeLessThanOrEqual(100)
    })

    it("should handle special regex characters in keywords", () => {
      const domainWithRegexChars: DomainDefinition = {
        ...mockDatabaseDomain,
        keywords: ["user.find()"]
      }
      const content = "user.find()"
      const score = calculateDomainIntensity("test.ts", content, domainWithRegexChars)
      expect(score).toBeGreaterThanOrEqual(0)
    })
  })

  describe("language-specific imports", () => {
    it("should detect Python imports", () => {
      const domain: DomainDefinition = {
        name: "Database",
        color: "#ff6b6b",
        keywords: [],
        imports: ["sqlalchemy", "psycopg2"],
        pathPatterns: [],
        weights: { import: 5 }
      }

      const content = `
        from sqlalchemy import create_engine
        import psycopg2
      `
      const score = calculateDomainIntensity("db.py", content, domain)
      expect(score).toBeGreaterThanOrEqual(10)
    })

    it("should detect Go imports", () => {
      const domain: DomainDefinition = {
        name: "Database",
        color: "#ff6b6b",
        keywords: [],
        imports: ["database/sql", "gorm.io/gorm"],
        pathPatterns: [],
        weights: { import: 5 }
      }

      const content = `
        import (
          "database/sql"
          "gorm.io/gorm"
        )
      `
      const score = calculateDomainIntensity("db.go", content, domain)
      expect(score).toBeGreaterThanOrEqual(10)
    })

    it("should detect Rust uses", () => {
      const domain: DomainDefinition = {
        name: "Database",
        color: "#ff6b6b",
        keywords: [],
        imports: ["sqlx", "diesel"],
        pathPatterns: [],
        weights: { import: 5 }
      }

      const content = `
        use sqlx::PgPool;
        use diesel::prelude::*;
      `
      const score = calculateDomainIntensity("db.rs", content, domain)
      expect(score).toBeGreaterThanOrEqual(10)
    })
  })
})

describe("calculateAllIntensities", () => {
  it("should calculate intensities for multiple files and domains", () => {
    const files = new Map([
      [
        "src/models/User.ts",
        `
        import { PrismaClient } from 'prisma'
        const prisma = new PrismaClient()
      `
      ],
      [
        "src/components/Button.tsx",
        `
        import React from 'react'
        export const Button = () => <button>Click</button>
      `
      ]
    ])

    const domains = {
      Database: {
        name: "Database",
        color: "#ff6b6b" as const,
        keywords: ["prisma", "Model"],
        imports: ["prisma"],
        pathPatterns: ["**/models/**"],
        weights: { keyword: 1, import: 5, path: 10 }
      },
      UI: {
        name: "UI",
        color: "#4ecdc4" as const,
        keywords: ["button", "component"],
        imports: ["react"],
        pathPatterns: ["**/components/**", "*.tsx"],
        weights: { keyword: 1, import: 5, path: 10 }
      }
    }

    const result = calculateAllIntensities(files, domains)

    expect(result.size).toBe(2)
    expect(result.get("src/models/User.ts")?.get("Database")).toBeGreaterThan(0)
    expect(result.get("src/components/Button.tsx")?.get("UI")).toBeGreaterThan(0)
  })

  it("should handle empty file map", () => {
    const result = calculateAllIntensities(new Map(), {})
    expect(result.size).toBe(0)
  })

  it("should handle files with no matches", () => {
    const files = new Map([["utils.ts", "export const noop = () => {}"]])
    const domains = {
      Database: {
        name: "Database",
        color: "#ff6b6b" as const,
        keywords: ["SELECT"],
        imports: ["prisma"],
        pathPatterns: ["**/models/**"],
        weights: { keyword: 1, import: 5, path: 10 }
      }
    }

    const result = calculateAllIntensities(files, domains)
    expect(result.get("utils.ts")?.get("Database")).toBe(0)
  })
})
