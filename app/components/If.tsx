import * as React from "react"

export interface IfProps {
  condition: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Render a component only if the condition is true.
 * If condition is false, render the fallback if provided, otherwise return null.
 */
export const If = function If({ condition, children, fallback }: IfProps) {
  if (condition) return children
  return fallback ?? null
}
