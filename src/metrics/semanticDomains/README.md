# Semantic Domain Highlighting

A flexible system for highlighting code files based on their **semantic purpose** (Database, UI, API, etc.) rather than just git metrics.

## Features

- ✅ **Built-in defaults** for common patterns across multiple languages (JavaScript/TypeScript, Python, Go, Rust)
- ✅ **User-configurable** via `.git-truck.json` in repo root
- ✅ **Extensible** - add custom domains or extend existing ones
- ✅ **Multi-signal analysis** - combines path patterns, import statements, and keyword frequency
- ✅ **Intensity scoring** (0-100) for gradient visualization
- ✅ **Cached** - results cached per file hash + config hash for performance
- ✅ **Well-tested** - 95%+ code coverage

## Quick Start

### 1. Zero Configuration (Use Defaults)

```typescript
import { loadDomainConfig, calculateDomainIntensity } from './semanticDomains'

const domains = loadDomainConfig('/path/to/repo')
const intensity = calculateDomainIntensity(
  'src/db/users.ts',
  fileContent,
  domains.Database
)
```

### 2. Customize for Your Project

Create `.git-truck.json` in your repo root:

```json
{
  "semanticDomains": {
    "Database": {
      "keywords": ["Prisma", "findUnique"],
      "imports": ["@prisma/client"]
    }
  }
}
```

## Built-in Domains

| Domain | Color | Description |
|--------|-------|-------------|
| **Database** | `#ff6b6b` | SQL queries, ORMs, database operations |
| **UI** | `#4ecdc4` | React/Vue/Svelte components, UI rendering |
| **API** | `#45b7d1` | HTTP routes, endpoints, controllers |
| **Testing** | `#95e1d3` | Test files, specs, mocks |
| **Config** | `#f38181` | Configuration files, settings, env vars |
| **Auth** | `#a8e6cf` | Authentication, authorization, login |

## How It Works

### Three-Signal Analysis

Each file is scored (0-100) based on three weighted signals:

1. **Path Patterns** (weight: 10)
   - Matches file paths against glob patterns
   - e.g., `**/models/**`, `*.sql`, `**/components/**`

2. **Import Statements** (weight: 5)
   - Detects imported packages/modules
   - Supports JS/TS, Python, Go, Rust
   - e.g., `prisma`, `react`, `flask`

3. **Keyword Frequency** (weight: 1)
   - TF-IDF-style keyword density
   - Normalized by file length
   - e.g., `SELECT`, `useState`, `@app.route`

### Scoring Example

```typescript
// src/db/users.ts
import { PrismaClient } from '@prisma/client'

export async function getUsers() {
  return await prisma.user.findMany({
    where: { active: true }
  })
}
```

**Database domain score:**
- Path match (`**/db/**`): +10
- Import match (`prisma`): +5
- Keywords (`prisma`, `findMany`): +2
- **Total: 17/100**

## Configuration Guide

### Extending Defaults

Arrays (keywords, imports, pathPatterns) are **concatenated**, not replaced:

```json
{
  "semanticDomains": {
    "Database": {
      "keywords": ["myCustomQuery"],
      "imports": ["my-orm"]
    }
  }
}
```

Result: Default keywords/imports **+** your additions.

### Overriding Scalars

Scalar fields (name, color, enabled, weights) are **replaced**:

```json
{
  "semanticDomains": {
    "Database": {
      "color": "#ff0000",
      "weights": {
        "keyword": 2,
        "import": 10,
        "path": 15
      }
    }
  }
}
```

### Adding Custom Domains

```json
{
  "semanticDomains": {
    "MachineLearning": {
      "name": "Machine Learning",
      "color": "#ff9f43",
      "keywords": ["train", "model", "predict"],
      "imports": ["tensorflow", "torch", "sklearn"],
      "pathPatterns": ["**/ml/**", "*.ipynb"],
      "weights": {
        "keyword": 1,
        "import": 7,
        "path": 12
      }
    }
  }
}
```

### Disabling Domains

```json
{
  "semanticDomains": {
    "UI": {
      "enabled": false
    }
  }
}
```

## API Reference

### `loadDomainConfig(repoPath: string): Record<string, DomainDefinition>`

Loads domain configuration with three-tier merge:
1. Built-in defaults
2. User config (`.git-truck.json`)
3. Filter disabled domains

### `calculateDomainIntensity(filePath: string, fileContent: string, domain: DomainDefinition): number`

Calculates intensity score (0-100) for a single file and domain.

### `calculateAllIntensities(files: Map<string, string>, domains: Record<string, DomainDefinition>): Map<string, Map<string, number>>`

Batch calculates intensities for multiple files across all domains.

### `hashDomainConfig(domains: Record<string, DomainDefinition>): string`

Generates hash for cache invalidation. When config changes, cached results are recomputed.

### `generateConfigTemplate(): string`

Generates template config with all default domains (for `--init-semantic-config`).

### `initConfigFile(repoPath: string): string`

Creates `.git-truck.json` template in repo. Throws if already exists.

## Integration with git-truck Metrics

### Add Semantic Metrics

Extend `src/metrics/metrics.ts`:

```typescript
export const Metric = {
  // ... existing metrics
  SEMANTIC_DATABASE: "Database",
  SEMANTIC_UI: "UI",
  SEMANTIC_API: "API"
}
```

### Create Metric Calculators

```typescript
export function createSemanticMetric(
  domain: DomainDefinition,
  intensities: Record<string, number>
): MetricCalculation {
  return (blob: GitBlobObject, cache: MetricCache) => {
    const intensity = intensities[blob.path] || 0

    if (intensity > 0) {
      const [h, s] = extractHSLFromHex(domain.color)
      const lightness = 95 - (intensity / 100) * 55
      cache.colormap.set(blob.path, hslToHex(h, s, lightness))
    }
  }
}
```

### Cache in DuckDB

```sql
CREATE TABLE semantic_intensities (
  filepath VARCHAR,
  file_hash VARCHAR,
  domain VARCHAR,
  intensity INTEGER,
  config_hash VARCHAR,
  PRIMARY KEY (filepath, domain, config_hash)
)
```

## Testing

Run tests:

```bash
npm run test:unit -- src/metrics/semanticDomains
```

Coverage: **95%+** (53 tests passing)

## Examples

See [EXAMPLE.md](./EXAMPLE.md) for detailed usage examples including:
- Python/SQLAlchemy projects
- Multi-language monorepos
- Custom domain definitions
- Cache invalidation strategies
- CLI integration

## Architecture

```
semanticDomains/
├── types.ts           # TypeScript interfaces
├── defaults.ts        # Built-in domain definitions
├── calculator.ts      # Intensity scoring logic
├── loader.ts          # Config loading and merging
├── index.ts           # Public API exports
├── *.test.ts          # Test suites
├── EXAMPLE.md         # Usage examples
└── README.md          # This file
```

## Future Enhancements

- [ ] LLM-based classification (optional enhancement)
- [ ] Per-domain confidence thresholds
- [ ] Domain hierarchy (parent/child relationships)
- [ ] Multi-domain files (show dominant + secondary domains)
- [ ] Visual config editor in UI
- [ ] Domain suggestions based on repo analysis

## License

Same as git-truck (check root LICENSE)
