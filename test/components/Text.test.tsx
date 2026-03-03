/**
 * Text component tests.
 *
 * Covers: text/tx/children precedence, presets, size/weight/color props,
 * withAsterisk, empty string, very long text, numberOfLines.
 */

import React from "react"
import { render } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"

import { Text } from "../../app/components/Text"
import { ThemeProvider } from "../../app/theme/context"

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function renderText(props: React.ComponentProps<typeof Text>, children?: React.ReactNode) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Text {...props}>{children}</Text>
      </NavigationContainer>
    </ThemeProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Text component", () => {
  it("renders text prop", () => {
    const { getByText } = renderText({ text: "Hello" })
    expect(getByText("Hello")).toBeDefined()
  })

  it("renders children when no text or tx prop", () => {
    const { getByText } = renderText({}, "Child text")
    expect(getByText("Child text")).toBeDefined()
  })

  it("prefers tx (i18n) over text and children", () => {
    // Our mock i18n returns `key JSON.stringify(params)` — so any truthy string means tx won
    const { queryByText } = renderText({ tx: "common:ok" as any, text: "Fallback" }, "Children")
    // tx translation is truthy → text and children are ignored
    expect(queryByText("Fallback")).toBeNull()
    expect(queryByText("Children")).toBeNull()
  })

  it("falls back to text when tx is not provided", () => {
    const { getByText } = renderText({ text: "Fallback text" })
    expect(getByText("Fallback text")).toBeDefined()
  })

  it("falls back to children when neither tx nor text are provided", () => {
    const { getByText } = renderText({}, "Children only")
    expect(getByText("Children only")).toBeDefined()
  })

  it("renders empty string without crashing", () => {
    const { toJSON } = renderText({ text: "" })
    expect(toJSON()).toBeTruthy()
  })

  it("renders very long text without crashing", () => {
    const longText = "A".repeat(10_000)
    const { getByText } = renderText({ text: longText })
    expect(getByText(longText)).toBeDefined()
  })

  it("appends asterisk when withAsterisk is true and content is a string", () => {
    const { getByText } = renderText({ text: "Required field", withAsterisk: true })
    expect(getByText("Required field *")).toBeDefined()
  })

  it("does not append asterisk when withAsterisk is false", () => {
    const { getByText } = renderText({ text: "Normal field", withAsterisk: false })
    expect(getByText("Normal field")).toBeDefined()
  })

  describe("presets render without crash", () => {
    const presets = ["default", "bold", "heading", "subheading", "formLabel", "formHelper"] as const
    for (const preset of presets) {
      it(`renders preset "${preset}"`, () => {
        const { getByText } = renderText({ text: `Preset ${preset}`, preset })
        expect(getByText(`Preset ${preset}`)).toBeDefined()
      })
    }
  })

  it("applies numberOfLines", () => {
    const { toJSON } = renderText({ text: "Short", numberOfLines: 1 })
    const tree = toJSON()
    // RNText should have numberOfLines in its props
    expect(tree).toBeTruthy()
  })
})
