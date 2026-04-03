// ============================================================
// ARKZEN ENGINE — DNA CONFIG
// Set once per project. Defines the design system baseline.
// All components inherit from this. Never touch per tatemono.
// ============================================================

export const ArkzenConfig = {

  // ─── Brand ──────────────────────────────────
  brand: {
    name: 'My App',
    logo: null, // React node or null for default
  },

  // ─── Typography ─────────────────────────────
  typography: {
    fontSans:    'Inter Variable, Inter, sans-serif',
    fontDisplay: 'Cal Sans, Inter Variable, sans-serif',
    fontMono:    'JetBrains Mono, Fira Code, monospace',
  },

  // ─── Colors ─────────────────────────────────
  colors: {
    primary:   '#0a0a0a',
    secondary: '#404040',
    accent:    '#3b82f6',
    surface:   '#ffffff',
    border:    '#e5e7eb',
    muted:     '#6b7280',
  },

  // ─── Component Defaults ──────────────────────
  // These apply globally unless overridden in @arkzen:config
  components: {

    modal: {
      borderRadius: '2xl' as const,
      backdrop:     'blur' as const,
      animation:    'fadeScale' as const,
      size:         'md' as const,
    },

    toast: {
      position: 'top-right' as const,
      duration: 3000,
      style:    'minimal' as const,
    },

    table: {
      striped:   true,
      hoverable: true,
      border:    'row' as const,
    },

    breadcrumb: {
      separator: '/' as const,
      showHome:  true,
    },

    dialog: {
      size:      'sm' as const,
      animation: 'fadeScale' as const,
    },

    drawer: {
      side: 'right' as const,
      size: 'md' as const,
    },

    pagination: {
      showCount: true,
    },

  },

  // ─── Layout ──────────────────────────────────
  layout: {
    defaultLayout: 'base' as const,
    sidebarCollapsed: false,
  },

}

export type ArkzenConfigType = typeof ArkzenConfig
