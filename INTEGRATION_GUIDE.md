# Semantic Domains - Integration Guide for git-truck

This guide shows how to integrate semantic domain highlighting into git-truck's visualization.

## Quick Test (Manual Integration)

For now, you can test semantic domains manually by adding them to the `Metric` enum and metric calculators.

### Step 1: Add to Metric Enum

Edit `src/metrics/metrics.ts`:

```typescript
export const Metric = {
  FILE_TYPE: "File type",
  MOST_COMMITS: "Commits",
  MOST_CONTRIBUTIONS: "Line changes",
  TOP_CONTRIBUTOR: "Top contributor",
  LAST_CHANGED: "Last changed",
  // Add semantic domains
  SEMANTIC_DATABASE: "Database",
  SEMANTIC_API: "API",
  SEMANTIC_TESTING: "Testing"
}
```

### Step 2: Update getMetricCalcs()

In `src/metrics/metrics.ts`, import and add semantic calculators:

```typescript
import { createSemanticMetric } from "./semanticMetric"

export function getMetricCalcs(
  data: RepoData,
  authorColors: Record<string, `#${string}`>,
  dominantAuthorCutoff: number
): [metricType: MetricType, func: (blob: GitBlobObject, cache: MetricCache) => void][] {
  // ... existing metrics ...

  // Add semantic metrics
  const semanticMetrics: [MetricType, (blob: GitBlobObject, cache: MetricCache) => void][] = []

  try {
    const repoPath = data.repo.path
    semanticMetrics.push(
      ["SEMANTIC_DATABASE" as MetricType, createSemanticMetric(repoPath, "Database", data.databaseInfo.fileTree)],
      ["SEMANTIC_API" as MetricType, createSemanticMetric(repoPath, "API", data.databaseInfo.fileTree)],
      ["SEMANTIC_TESTING" as MetricType, createSemanticMetric(repoPath, "Testing", data.databaseInfo.fileTree)]
    )
  } catch (err) {
    console.warn("Failed to load semantic metrics:", err)
  }

  return [
    // ... existing metrics ...
    ...semanticMetrics
  ]
}
```

### Step 3: Add to getMetricDescription()

```typescript
export function getMetricDescription(metric: MetricType): string {
  switch (metric) {
    // ... existing cases ...
    case "SEMANTIC_DATABASE":
      return "Files related to database models, queries, and ORM operations"
    case "SEMANTIC_API":
      return "API endpoints, route handlers, and HTTP controllers"
    case "SEMANTIC_TESTING":
      return "Test files, specs, and test utilities"
    default:
      throw new Error("Unknown metric type: " + metric)
  }
}
```

### Step 4: Add to getMetricLegendType()

```typescript
export function getMetricLegendType(metric: MetricType): LegendType {
  switch (metric) {
    // ... existing cases ...
    case "SEMANTIC_DATABASE":
    case "SEMANTIC_API":
    case "SEMANTIC_TESTING":
      return "POINT"
    default:
      throw new Error("Unknown metric type: " + metric)
  }
}
```

### Step 5: Add Icons (Optional)

In `src/components/Options.tsx`, add icons for semantic metrics:

```typescript
import { mdiDatabase, mdiApi, mdiTestTube } from "@mdi/js"

const visualizationIcons: Record<MetricType, string> = {
  // ... existing icons ...
  SEMANTIC_DATABASE: mdiDatabase,
  SEMANTIC_API: mdiApi,
  SEMANTIC_TESTING: mdiTestTube
}
```

### Step 6: Configure Your Project

Create `.git-truck.json` in your repo (optional, works with defaults):

```json
{
  "semanticDomains": {
    "Database": {
      "keywords": ["your", "custom", "keywords"],
      "imports": ["your-orm"],
      "enabled": true
    }
  }
}
```

### Step 7: Run git-truck

```bash
cd /Users/gh/zeeguu/api
git-truck
```

You should now see "Database", "API", and "Testing" in the metrics dropdown!

## Alternative: Command-Line Testing

For quick testing without UI integration, use the analysis scripts:

```bash
# Test on Zeeguu API
npx tsx test-zeeguu.ts

# Full analysis
npx tsx analyze-zeeguu-full.ts
```

## Full Dynamic Integration (Future Work)

For a complete dynamic system that loads domains from config at runtime:

1. **Modify RepoData interface** to include semantic domains:
```typescript
export interface DatabaseInfo {
  // ... existing fields ...
  semanticDomains?: Record<string, DomainDefinition>
}
```

2. **Load domains in loader function** (`src/routes/$repo.$.tsx`):
```typescript
export const loader = async ({ params }: LoaderFunctionArgs) => {
  // ... existing code ...
  const semanticDomains = loadDomainConfig(repoPath)
  databaseInfo.semanticDomains = semanticDomains
}
```

3. **Dynamically generate metrics** in `createMetricData()`:
```typescript
export function createMetricData(data: RepoData, ...): MetricsData {
  const metricCalcs = getMetricCalcs(data, ...)

  // Add dynamic semantic metrics
  if (data.databaseInfo.semanticDomains) {
    for (const [domainName] of Object.entries(data.databaseInfo.semanticDomains)) {
      metricCalcs.push([
        `SEMANTIC_${domainName.toUpperCase()}` as MetricType,
        createSemanticMetric(data.repo.path, domainName, data.databaseInfo.fileTree)
      ])
    }
  }

  return [setupMetricsCache(data.databaseInfo.fileTree, metricCalcs), ...]
}
```

4. **Update UI** to show dynamic metrics with section headers:
```typescript
// In Options.tsx
<optgroup label="Git Metrics">
  {/* FILE_TYPE, MOST_COMMITS, etc. */}
</optgroup>
<optgroup label="Semantic Domains">
  {/* Database, API, Testing, etc. */}
</optgroup>
```

## Testing Checklist

- [ ] Semantic metrics appear in dropdown
- [ ] Files are colored based on domain intensity
- [ ] Legend shows intensity buckets
- [ ] Custom `.git-truck.json` config is respected
- [ ] Multiple domains work simultaneously
- [ ] Performance is acceptable (file reading is cached)

## Performance Notes

The current implementation reads all files to analyze content. For large repos:

1. **Add caching**: Store intensities in DuckDB
2. **Lazy loading**: Only analyze files when semantic metric is selected
3. **Sampling**: Analyze subset of files for large repos

## Troubleshooting

**Metrics don't appear in dropdown:**
- Check TypeScript compilation errors
- Verify `Metric` enum includes new entries
- Ensure `MetricType` type is updated

**Files not colored:**
- Check browser console for errors
- Verify `.git-truck.json` is in repo root
- Test with command-line scripts first

**Performance issues:**
- Reduce file set in `collectFileContents()`
- Add file size limit
- Implement caching layer

## Next Steps

1. ✅ Core semantic domain system (DONE)
2. ✅ Test on real codebase (DONE - Zeeguu)
3. ⏳ UI integration (IN PROGRESS - this guide)
4. ⏳ Add caching layer
5. ⏳ Polish UX (icons, descriptions, etc.)
