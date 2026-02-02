export interface DomainDefinition {
  name: string
  color: `#${string}`
  keywords: string[]
  imports: string[]
  pathPatterns: string[]
  weights?: {
    keyword?: number
    import?: number
    path?: number
  }
  enabled?: boolean
}

export interface DomainConfig {
  semanticDomains: Record<string, Partial<DomainDefinition>>
}

export interface DomainIntensities {
  [filepath: string]: {
    [domain: string]: number
  }
}
