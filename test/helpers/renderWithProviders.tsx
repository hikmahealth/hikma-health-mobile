import { ReactElement } from "react"
import { render, RenderOptions } from "@testing-library/react-native"

import { ThemeProvider } from "../../app/theme/context"

// Create a wrapper component that includes all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider initialContext="light">{children}</ThemeProvider>
}

// Custom render function that wraps components with providers
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from React Testing Library
export * from "@testing-library/react-native"

// Override the default render with our custom one
export { customRender as render }
