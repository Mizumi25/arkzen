// ============================================================
// ARKZEN ENGINE — TYPE DEFINITIONS v5.0
// Key changes:
//   - meta.layout removed (per-page layout now)
//   - pages[] array replaces single page
//   - layouts[] for custom layouts
//   - ALL markers are now repeatable with identifiers
//   - validator types added
// ============================================================

export interface ArkzenMeta {
  name: string
  version: string
  description: string
  auth: boolean          // enables global auth guard
  dependencies: string[]
  // NOTE: layout is now per-page, not global — removed from meta
}

export interface ArkzenConfigOverride {
  modal?: {
    borderRadius?: string
    backdrop?: string
    animation?: string
  }
  toast?: {
    position?: string
    duration?: number
    style?: string
  }
  table?: {
    striped?: boolean
    hoverable?: boolean
    border?: string
  }
  breadcrumb?: {
    separator?: string
    style?: string
  }
  dialog?: {
    size?: string
    animation?: string
  }
  // v5: per-layout class config
  layout?: {
    guest?: {
      className?: string
      container?: string
    }
    auth?: {
      className?: string
      container?: string
    }
    [customLayout: string]: {
      className?: string
      container?: string
    } | undefined
  }
}

export interface ArkzenColumn {
  type: string
  length?: number
  nullable?: boolean
  default?: string | number | boolean
  unique?: boolean
  primary?: boolean
  autoIncrement?: boolean
  foreign?: string
  onDelete?: string
  precision?: number
  scale?: number
  unsigned?: boolean
}

export interface ArkzenIndex {
  columns: string[]
  unique: boolean
}

export interface ArkzenSeederItem {
  [key: string]: string | number | boolean | null
}

export interface ArkzenDatabase {
  table: string
  timestamps: boolean
  softDeletes: boolean
  columns: Record<string, ArkzenColumn>
  indexes?: ArkzenIndex[]
  seeder?: {
    count: number
    data?: ArkzenSeederItem[]
  }
}

export interface ArkzenEndpointValidation {
  [field: string]: string
}

export interface ArkzenEndpointQuery {
  [param: string]: string
}

export interface ArkzenEndpointResponse {
  type: 'paginated' | 'single' | 'collection' | 'message'
  resource?: string
  value?: string
}

export interface ArkzenEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  route: string
  description: string
  validation?: ArkzenEndpointValidation
  query?: ArkzenEndpointQuery
  response: ArkzenEndpointResponse
}

export interface ArkzenApi {
  model: string
  controller: string
  prefix: string
  middleware: string[]
  endpoints: Record<string, ArkzenEndpoint>
  resource?: boolean   // ← ADD THIS
  policy?: boolean     // ← ADD THIS
  factory?: boolean    // ← ADD THIS
}

export interface ArkzenSection {
  raw: string
  start: number
  end: number
}

// v5: per-page layout
export type ArkzenPageLayout = 'guest' | 'auth' | string

export interface ArkzenPage {
  name: string
  layout: ArkzenPageLayout
  raw: string
  start: number
  end: number
}

export interface ArkzenLayout {
  name: string
  raw: string
  start: number
  end: number
}

export interface ParsedTatemono {
  filePath: string
  fileName: string
  meta: ArkzenMeta
  config?: ArkzenConfigOverride

  databases: ArkzenDatabase[]
  apis:      ArkzenApi[]
  pages:     ArkzenPage[]
  layouts:   ArkzenLayout[]

  stores:        ArkzenSection[]
  realtimes:     ArkzenSection[]
  events:        ArkzenSection[]
  jobs:          ArkzenSection[]
  notifications: ArkzenSection[]
  mails:         ArkzenSection[]
  consoles:      ArkzenSection[]
  components:    ArkzenSection[]

  animation?: ArkzenSection
}

export interface ArkzenRegistry {
  engine: string
  project: string
  modules: ArkzenRegistryEntry[]
}

export interface ArkzenRegistryEntry {
  name: string
  version: string
  status: 'active' | 'inactive' | 'error'
  filePath: string
  pages: string[]
  registered: string
  lastUpdated: string
}

export interface BuildResult {
  success: boolean
  tatemono: string
  steps: BuildStep[]
  errors: string[]
}

export interface BuildStep {
  name: string
  status: 'success' | 'failed' | 'skipped'
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary?: {
    tables: string[]
    pages: string[]
    resources: string[]
  }
}