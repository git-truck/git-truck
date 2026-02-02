import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { loadDomainConfig, hashDomainConfig, generateConfigTemplate, initConfigFile } from "./loader.server"
import { DEFAULT_DOMAINS } from "./defaults"
import type { DomainConfig } from "./types"

describe("loadDomainConfig", () => {
  let tempDir: string

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-truck-test-"))
  })

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("should return defaults when no config file exists", () => {
    const config = loadDomainConfig(tempDir)
    expect(config).toEqual(DEFAULT_DOMAINS)
  })

  it("should merge user keywords with defaults", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        Database: {
          keywords: ["myCustomQuery"],
          imports: ["my-orm"]
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)

    // Should contain both default and user keywords
    expect(config.Database.keywords).toContain("SELECT") // Default
    expect(config.Database.keywords).toContain("myCustomQuery") // User
    expect(config.Database.imports).toContain("prisma") // Default
    expect(config.Database.imports).toContain("my-orm") // User
  })

  it("should override scalar fields like color", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        Database: {
          color: "#123456"
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(config.Database.color).toBe("#123456")
  })

  it("should allow disabling default domains", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        Database: {
          enabled: false
        },
        UI: {
          enabled: true
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(config.Database).toBeUndefined()
    expect(config.UI).toBeDefined()
  })

  it("should allow adding new custom domains", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        CustomDomain: {
          name: "Custom Domain",
          color: "#abcdef",
          keywords: ["custom"],
          imports: ["custom-lib"],
          pathPatterns: ["**/custom/**"]
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(config.CustomDomain).toBeDefined()
    expect(config.CustomDomain.name).toBe("Custom Domain")
    expect(config.CustomDomain.keywords).toContain("custom")
  })

  it("should merge weights correctly", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        Database: {
          weights: {
            keyword: 2 // Override just keyword weight
          }
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(config.Database.weights?.keyword).toBe(2) // User override
    expect(config.Database.weights?.import).toBe(5) // Default preserved
    expect(config.Database.weights?.path).toBe(10) // Default preserved
  })

  it("should deduplicate arrays when merging", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        Database: {
          keywords: ["SELECT", "customKeyword"] // SELECT already in defaults
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    const selectCount = config.Database.keywords.filter((k) => k === "SELECT").length
    expect(selectCount).toBe(1) // Should only appear once
    expect(config.Database.keywords).toContain("customKeyword")
  })

  it("should handle malformed JSON gracefully", () => {
    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), "{ invalid json }")

    // Should return defaults and log warning
    const config = loadDomainConfig(tempDir)
    expect(config).toEqual(DEFAULT_DOMAINS)
  })

  it("should handle config without semanticDomains key", () => {
    const userConfig = {
      someOtherConfig: "value"
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(config).toEqual(DEFAULT_DOMAINS)
  })

  it("should generate default color for new domains without color", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        NewDomain: {
          keywords: ["new"]
          // No color specified
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(config.NewDomain.color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it("should preserve all default domains when only extending one", () => {
    const userConfig: DomainConfig = {
      semanticDomains: {
        Database: {
          keywords: ["custom"]
        }
      }
    }

    fs.writeFileSync(path.join(tempDir, ".git-truck.json"), JSON.stringify(userConfig))

    const config = loadDomainConfig(tempDir)
    expect(Object.keys(config).length).toBe(Object.keys(DEFAULT_DOMAINS).length)
    expect(config.UI).toBeDefined()
    expect(config.API).toBeDefined()
    expect(config.Testing).toBeDefined()
  })
})

describe("hashDomainConfig", () => {
  it("should generate consistent hash for same config", () => {
    const config = { ...DEFAULT_DOMAINS }
    const hash1 = hashDomainConfig(config)
    const hash2 = hashDomainConfig(config)
    expect(hash1).toBe(hash2)
  })

  it("should generate different hash when config changes", () => {
    const config1 = { ...DEFAULT_DOMAINS }
    const config2 = {
      ...DEFAULT_DOMAINS,
      Database: {
        ...DEFAULT_DOMAINS.Database,
        keywords: [...DEFAULT_DOMAINS.Database.keywords, "newKeyword"]
      }
    }

    const hash1 = hashDomainConfig(config1)
    const hash2 = hashDomainConfig(config2)
    expect(hash1).not.toBe(hash2)
  })

  it("should be order-independent for domain order", () => {
    const config1 = {
      A: DEFAULT_DOMAINS.Database,
      B: DEFAULT_DOMAINS.UI
    }
    const config2 = {
      B: DEFAULT_DOMAINS.UI,
      A: DEFAULT_DOMAINS.Database
    }

    const hash1 = hashDomainConfig(config1)
    const hash2 = hashDomainConfig(config2)
    expect(hash1).toBe(hash2)
  })

  it("should be order-independent for keywords within domain", () => {
    const config1 = {
      Database: {
        ...DEFAULT_DOMAINS.Database,
        keywords: ["a", "b", "c"]
      }
    }
    const config2 = {
      Database: {
        ...DEFAULT_DOMAINS.Database,
        keywords: ["c", "b", "a"]
      }
    }

    const hash1 = hashDomainConfig(config1)
    const hash2 = hashDomainConfig(config2)
    expect(hash1).toBe(hash2)
  })

  it("should include weights in hash", () => {
    const config1 = {
      Database: {
        ...DEFAULT_DOMAINS.Database,
        weights: { keyword: 1, import: 5, path: 10 }
      }
    }
    const config2 = {
      Database: {
        ...DEFAULT_DOMAINS.Database,
        weights: { keyword: 2, import: 5, path: 10 }
      }
    }

    const hash1 = hashDomainConfig(config1)
    const hash2 = hashDomainConfig(config2)
    expect(hash1).not.toBe(hash2)
  })
})

describe("generateConfigTemplate", () => {
  it("should generate valid JSON", () => {
    const template = generateConfigTemplate()
    // Remove comments before parsing
    const jsonPart = template.split("\n").slice(3).join("\n")
    expect(() => JSON.parse(jsonPart)).not.toThrow()
  })

  it("should include all default domains", () => {
    const template = generateConfigTemplate()
    for (const domainName of Object.keys(DEFAULT_DOMAINS)) {
      expect(template).toContain(domainName)
    }
  })

  it("should include placeholder text for user customization", () => {
    const template = generateConfigTemplate()
    expect(template).toContain("<add custom keywords>")
    expect(template).toContain("<add custom imports>")
    expect(template).toContain("<add custom path patterns>")
  })

  it("should preserve default colors", () => {
    const template = generateConfigTemplate()
    const jsonPart = template.split("\n").slice(3).join("\n")
    const config = JSON.parse(jsonPart)
    expect(config.semanticDomains.Database.color).toBe(DEFAULT_DOMAINS.Database.color)
  })

  it("should include weights in template", () => {
    const template = generateConfigTemplate()
    expect(template).toContain("weights")
  })
})

describe("initConfigFile", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-truck-test-"))
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it("should create config file", () => {
    const configPath = initConfigFile(tempDir)
    expect(fs.existsSync(configPath)).toBe(true)
  })

  it("should return correct path", () => {
    const configPath = initConfigFile(tempDir)
    expect(configPath).toBe(path.join(tempDir, ".git-truck.json"))
  })

  it("should throw if config already exists", () => {
    const existingConfig = path.join(tempDir, ".git-truck.json")
    fs.writeFileSync(existingConfig, "{}")

    expect(() => initConfigFile(tempDir)).toThrow("already exists")
  })

  it("should create valid config file", () => {
    const configPath = initConfigFile(tempDir)
    const content = fs.readFileSync(configPath, "utf-8")

    // Remove comments and parse
    const jsonPart = content.split("\n").slice(3).join("\n")
    expect(() => JSON.parse(jsonPart)).not.toThrow()
  })
})
