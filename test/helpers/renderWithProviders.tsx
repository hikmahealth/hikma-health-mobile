import { ReactElement } from "react"
import { render, RenderOptions } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { ThemeProvider } from "../../app/theme/context"

const mockSafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }
const mockSafeAreaMetrics = {
  insets: mockSafeAreaInsets,
  frame: { x: 0, y: 0, width: 390, height: 844 },
}

// Create a wrapper component that includes all necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaProvider initialMetrics={mockSafeAreaMetrics}>
      <ThemeProvider initialContext="light">{children}</ThemeProvider>
    </SafeAreaProvider>
  )
}

// Custom render function that wraps components with providers
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from React Testing Library
export * from "@testing-library/react-native"

// Override the default render with our custom one
export { customRender as render }
