import * as React from "react"

export interface IfProps {
  condition: boolean
  children: React.ReactNode
}

/**
 * Render a component only if the condition is true.
 */
export const If = function If(props: IfProps) {
  if (props.condition) return props.children
  return null
}
