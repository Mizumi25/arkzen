'use client'

// ============================================================
// ARKZEN ENGINE — BLANK LAYOUT
// Zero wrapper. Complete freedom.
// Use for landing pages, awwwards-level designs, full canvas
// ============================================================

import React from 'react'

export interface BlankLayoutProps {
  children: React.ReactNode
  auth?: boolean
}

export const BlankLayout: React.FC<BlankLayoutProps> = ({ children }) => {
  return <>{children}</>
}
