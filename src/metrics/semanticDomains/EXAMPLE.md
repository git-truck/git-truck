# Semantic Domain Highlighting - Usage Examples

This document shows how to use the semantic domain system to highlight code by purpose rather than git metrics.

## Basic Usage

### 1. Using Default Domains (Zero Config)

```typescript
import { loadDomainConfig, calculateDomainIntensity } from './semanticDomains'

// Load built-in defaults
const domains = loadDomainConfig('/path/to/repo')

// Analyze a single file
const dbFileContent = `
  import { PrismaClient } from '@prisma/client'

  export async function getUsers() {
    const prisma = new PrismaClient()
    return await prisma.user.findMany()
  }
`

const intensity = calculateDomainIntensity(
  'src/db/users.ts',
  dbFileContent,
  domains.Database
)

console.log(`Database intensity: ${intensity}/100`)
// Output: Database intensity: 25/100
```

### 2. Batch Analysis

```typescript
import { calculateAllIntensities } from './semanticDomains'

const files = new Map([
  ['src/db/users.ts', fs.readFileSync('src/db/users.ts', 'utf-8')],
  ['src/components/Button.tsx', fs.readFileSync('src/components/Button.tsx', 'utf-8')],
  ['src/routes/api.ts', fs.readFileSync('src/routes/api.ts', 'utf-8')]
])

const domains = loadDomainConfig('/path/to/repo')
const allIntensities = calculateAllIntensities(files, domains)

// Access results
for (const [filepath, domainScores] of allIntensities) {
  console.log(`\n${filepath}:`)
  for (const [domainName, score] of domainScores) {
    if (score > 10) { // Only show significant matches
      console.log(`  ${domainName}: ${score}`)
    }
  }
}
```

## Configuration Examples

### 3. Extending Defaults for Python/SQLAlchemy Project

Create `.git-truck.json` in your repo root:

```json
{
  "semanticDomains": {
    "Database": {
      "keywords": [
        "db.session",
        "Base.metadata",
        "declarative_base"
      ],
      "imports": [
        "flask_sqlalchemy",
        "sqlalchemy.orm"
      ]
    },
    "API": {
      "keywords": [
        "@app.route",
        "jsonify",
        "Blueprint"
      ],
      "imports": [
        "flask",
        "flask_restful"
      ]
    },
    "UI": {
      "enabled": false
    }
  }
}
```

### 4. Adding Custom Domain

```json
{
  "semanticDomains": {
    "MachineLearning": {
      "name": "Machine Learning",
      "color": "#ff9f43",
      "keywords": [
        "train",
        "model",
        "predict",
        "fit",
        "accuracy",
        "loss",
        "epoch"
      ],
      "imports": [
        "tensorflow",
        "torch",
        "sklearn",
        "pandas",
        "numpy"
      ],
      "pathPatterns": [
        "**/models/**",
        "**/training/**",
        "**/ml/**",
        "*.ipynb"
      ],
      "weights": {
        "keyword": 1,
        "import": 7,
        "path": 12
      }
    }
  }
}
```

### 5. Overriding Weights

Give more importance to imports than keywords for a specific domain:

```json
{
  "semanticDomains": {
    "Database": {
      "weights": {
        "keyword": 0.5,
        "import": 10,
        "path": 15
      }
    }
  }
}
```

### 6. Multi-Language Monorepo

```json
{
  "semanticDomains": {
    "Database": {
      "keywords": [
        "Repository",
        "Entity",
        "@Repository"
      ],
      "imports": [
        "spring-data-jpa",
        "hibernate",
        "jdbc"
      ]
    },
    "Frontend": {
      "name": "Frontend",
      "color": "#00d2d3",
      "keywords": [
        "component",
        "template",
        "reactive"
      ],
      "imports": [
        "react",
        "vue",
        "@angular/core"
      ],
      "pathPatterns": [
        "frontend/**",
        "web/**",
        "client/**"
      ]
    },
    "Backend": {
      "name": "Backend",
      "color": "#ff6348",
      "keywords": [
        "controller",
        "service",
        "@RestController"
      ],
      "imports": [
        "spring-boot",
        "express",
        "fastapi"
      ],
      "pathPatterns": [
        "backend/**",
        "server/**",
        "api/**"
      ]
    }
  }
}
```

## Integration with git-truck

### 7. Generating Colormaps

```typescript
import { loadDomainConfig, calculateAllIntensities } from './semanticDomains'
import { hslToHex } from '~/utils/colors'

function createSemanticMetric(repoPath: string, domainName: string) {
  const domains = loadDomainConfig(repoPath)
  const domain = domains[domainName]

  if (!domain) {
    throw new Error(`Domain ${domainName} not found`)
  }

  // Load all file contents
  const files = new Map<string, string>()
  // ... populate files map ...

  const intensities = calculateAllIntensities(files, domains)

  // Convert intensities to colors
  const colormap = new Map<string, `#${string}`>()
  const [h, s] = extractHSLFromHex(domain.color)

  for (const [filepath, domainScores] of intensities) {
    const intensity = domainScores.get(domainName) || 0

    if (intensity > 0) {
      // Convert intensity (0-100) to lightness (95-40)
      const lightness = 95 - (intensity / 100) * 55
      colormap.set(filepath, hslToHex(h, s, lightness))
    }
  }

  return colormap
}
```

### 8. Cache Invalidation

```typescript
import { hashDomainConfig, loadDomainConfig } from './semanticDomains'
import type { DuckDBConnection } from './db'

async function getCachedIntensities(
  db: DuckDBConnection,
  repoPath: string,
  files: Map<string, { content: string, hash: string }>
) {
  const domains = loadDomainConfig(repoPath)
  const configHash = hashDomainConfig(domains)

  const result = new Map<string, Map<string, number>>()

  for (const [filepath, { content, hash }] of files) {
    // Check cache
    const cached = await db.query(`
      SELECT domain, intensity
      FROM semantic_intensities
      WHERE filepath = ? AND file_hash = ? AND config_hash = ?
    `, [filepath, hash, configHash])

    if (cached.length === Object.keys(domains).length) {
      // All domains cached
      const scores = new Map(cached.map(row => [row.domain, row.intensity]))
      result.set(filepath, scores)
    } else {
      // Recompute
      const intensities = calculateAllIntensities(
        new Map([[filepath, content]]),
        domains
      )

      const scores = intensities.get(filepath)!
      result.set(filepath, scores)

      // Update cache
      for (const [domain, intensity] of scores) {
        await db.run(`
          INSERT OR REPLACE INTO semantic_intensities
          (filepath, file_hash, domain, intensity, config_hash)
          VALUES (?, ?, ?, ?, ?)
        `, [filepath, hash, domain, intensity, configHash])
      }
    }
  }

  return result
}
```

## CLI Commands

### 9. Initialize Config

```bash
# Generate template config file
git-truck --init-semantic-config

# This creates .git-truck.json with all default domains
# Edit the file to customize for your project
```

### 10. Validate Config

```typescript
import { loadDomainConfig } from './semanticDomains'

try {
  const domains = loadDomainConfig(process.cwd())
  console.log('✓ Config valid')
  console.log(`Loaded ${Object.keys(domains).length} domains:`)
  for (const [name, domain] of Object.entries(domains)) {
    console.log(`  - ${name} (${domain.color})`)
  }
} catch (error) {
  console.error('✗ Config invalid:', error.message)
  process.exit(1)
}
```

## Real-World Example: Full Stack App

### 11. Complete Configuration

```json
{
  "semanticDomains": {
    "Database": {
      "keywords": ["Prisma", "findUnique", "findMany"],
      "imports": ["@prisma/client"],
      "enabled": true
    },
    "UI": {
      "keywords": ["Remix", "useLoaderData", "Form"],
      "imports": ["@remix-run/react"],
      "pathPatterns": ["app/components/**", "app/routes/**"],
      "enabled": true
    },
    "API": {
      "keywords": ["LoaderFunction", "ActionFunction", "json"],
      "imports": ["@remix-run/node"],
      "pathPatterns": ["app/routes/**"],
      "enabled": true
    },
    "Testing": {
      "imports": ["@playwright/test"],
      "enabled": true
    },
    "Auth": {
      "keywords": ["requireAuth", "session", "logout"],
      "imports": ["remix-auth"],
      "pathPatterns": ["app/auth/**"],
      "enabled": true
    },
    "Config": {
      "enabled": false
    }
  }
}
```

This configuration would correctly identify:
- `app/db/users.server.ts` → High Database score
- `app/components/Button.tsx` → High UI score
- `app/routes/api/users.ts` → High API score (and some Database)
- `app/auth/session.server.ts` → High Auth score
- `tests/e2e/login.spec.ts` → High Testing score
