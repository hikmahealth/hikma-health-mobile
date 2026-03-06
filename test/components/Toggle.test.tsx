/**
 * Toggle component tests.
 *
 * Tests the core Toggle logic using a minimal ToggleInput stub, bypassing
 * the Checkbox/Radio/Switch render complexity (native Image/Animated dependencies).
 *
 * Covers: value true/false, press toggles, disabled/editable=false blocks callback,
 * rapid toggling, undefined value, label positions, helper with error status.
 */

import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"
import { View } from "react-native"

import { Toggle, BaseToggleInputProps } from "../../app/components/Toggle/Toggle"
import { ThemeProvider } from "../../app/theme/context"

// ---------------------------------------------------------------------------
// Minimal ToggleInput stub — avoids native Image/Animated issues
// ---------------------------------------------------------------------------

function StubToggleInput(props: BaseToggleInputProps<unknown>) {
  return <View testID={props.on ? "toggle-on" : "toggle-off"} />
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function renderToggle(props: Partial<React.ComponentProps<typeof Toggle>>) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Toggle ToggleInput={StubToggleInput} {...(props as any)} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Toggle component", () => {
  it("renders with value=true without crash", () => {
    const { getByTestId } = renderToggle({ value: true })
    expect(getByTestId("toggle-on")).toBeDefined()
  })

  it("renders with value=false without crash", () => {
    const { getByTestId } = renderToggle({ value: false })
    expect(getByTestId("toggle-off")).toBeDefined()
  })

  it("calls onValueChange with !value on press", () => {
    const onValueChange = jest.fn()
    const { getByRole } = renderToggle({
      value: false,
      onValueChange,
      accessibilityRole: "checkbox",
    })
    fireEvent.press(getByRole("checkbox"))
    expect(onValueChange).toHaveBeenCalledWith(true)
  })

  it("calls onValueChange(false) when value is true", () => {
    const onValueChange = jest.fn()
    const { getByRole } = renderToggle({
      value: true,
      onValueChange,
      accessibilityRole: "checkbox",
    })
    fireEvent.press(getByRole("checkbox"))
    expect(onValueChange).toHaveBeenCalledWith(false)
  })

  it("does NOT call onValueChange when disabled", () => {
    const onValueChange = jest.fn()
    const { UNSAFE_root } = renderToggle({ value: false, onValueChange, disabled: true })
    fireEvent.press(UNSAFE_root)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("does NOT call onValueChange when editable=false", () => {
    const onValueChange = jest.fn()
    const { UNSAFE_root } = renderToggle({ value: false, onValueChange, editable: false })
    fireEvent.press(UNSAFE_root)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("does NOT call onValueChange when status=disabled", () => {
    const onValueChange = jest.fn()
    const { UNSAFE_root } = renderToggle({ value: false, onValueChange, status: "disabled" })
    fireEvent.press(UNSAFE_root)
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("handles rapid toggling (10 presses) without crash", () => {
    const onValueChange = jest.fn()
    const { getByRole } = renderToggle({
      value: false,
      onValueChange,
      accessibilityRole: "checkbox",
    })
    const toggle = getByRole("checkbox")
    for (let i = 0; i < 10; i++) {
      fireEvent.press(toggle)
    }
    // Controlled component: value prop stays false, so onValueChange always called with true
    expect(onValueChange).toHaveBeenCalledTimes(10)
    expect(onValueChange).toHaveBeenCalledWith(true)
  })

  it("renders with undefined value as off (no crash)", () => {
    const { getByTestId } = renderToggle({ value: undefined })
    expect(getByTestId("toggle-off")).toBeDefined()
  })

  it("renders label on the right (default)", () => {
    const { getByText } = renderToggle({ value: false, label: "Accept terms" })
    expect(getByText("Accept terms")).toBeDefined()
  })

  it("renders label on the left when labelPosition=left", () => {
    const { getByText } = renderToggle({
      value: false,
      label: "Left label",
      labelPosition: "left",
    })
    expect(getByText("Left label")).toBeDefined()
  })

  it("renders helper text", () => {
    const { getByText } = renderToggle({ value: false, helper: "Helper text" })
    expect(getByText("Helper text")).toBeDefined()
  })

  it("renders helper with error status without crash", () => {
    const { getByText } = renderToggle({
      value: false,
      helper: "This field is required",
      status: "error",
    })
    expect(getByText("This field is required")).toBeDefined()
  })
})
