/**
 * TextField component tests.
 *
 * Covers: labels, descriptions, helpers, status states, accessories,
 * typing, disabled state, multiline, and adversarial string inputs.
 */

import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { NavigationContainer } from "@react-navigation/native"
import { View, Text as RNText } from "react-native"
import fc from "fast-check"

import { TextField } from "../../app/components/TextField"
import { ThemeProvider } from "../../app/theme/context"

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function renderField(props: React.ComponentProps<typeof TextField>) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <TextField {...props} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TextField component", () => {
  it("renders with minimal props", () => {
    const { toJSON } = renderField({})
    expect(toJSON()).toBeTruthy()
  })

  it("renders label text", () => {
    const { getByText } = renderField({ label: "Email" })
    expect(getByText("Email")).toBeDefined()
  })

  it("renders description text", () => {
    const { getByText } = renderField({ description: "Enter your email address" })
    expect(getByText("Enter your email address")).toBeDefined()
  })

  it("renders helper text", () => {
    const { getByText } = renderField({ helper: "Must be valid" })
    expect(getByText("Must be valid")).toBeDefined()
  })

  it("renders placeholder text", () => {
    const { getByPlaceholderText } = renderField({ placeholder: "Type here..." })
    expect(getByPlaceholderText("Type here...")).toBeDefined()
  })

  it("fires onChangeText when typing", () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = renderField({
      placeholder: "input",
      onChangeText,
    })
    fireEvent.changeText(getByPlaceholderText("input"), "hello")
    expect(onChangeText).toHaveBeenCalledWith("hello")
  })

  it("does not allow editing when status is disabled", () => {
    const onChangeText = jest.fn()
    const { getByPlaceholderText } = renderField({
      placeholder: "disabled-input",
      status: "disabled",
      onChangeText,
    })
    const input = getByPlaceholderText("disabled-input")
    expect(input.props.editable).toBe(false)
  })

  it("does not allow editing when editable is false", () => {
    const { getByPlaceholderText } = renderField({
      placeholder: "readonly",
      editable: false,
    })
    const input = getByPlaceholderText("readonly")
    expect(input.props.editable).toBe(false)
  })

  it("renders RightAccessory", () => {
    const RightAccessory = () => <RNText testID="right-acc">R</RNText>
    const { getByTestId } = renderField({ RightAccessory })
    expect(getByTestId("right-acc")).toBeDefined()
  })

  it("renders LeftAccessory", () => {
    const LeftAccessory = () => <RNText testID="left-acc">L</RNText>
    const { getByTestId } = renderField({ LeftAccessory })
    expect(getByTestId("left-acc")).toBeDefined()
  })

  it("renders in multiline mode without crashing", () => {
    const { toJSON } = renderField({ multiline: true, placeholder: "multiline" })
    expect(toJSON()).toBeTruthy()
  })

  it("renders with error status without crashing", () => {
    const { getByText } = renderField({
      label: "Error Field",
      status: "error",
      helper: "Something went wrong",
    })
    expect(getByText("Something went wrong")).toBeDefined()
  })

  describe("adversarial string inputs (property-based)", () => {
    it("any string as label does not crash", () => {
      fc.assert(
        fc.property(fc.string(), (label) => {
          const { toJSON } = renderField({ label })
          expect(toJSON()).toBeTruthy()
        }),
        { numRuns: 20 },
      )
    })

    it("any string as placeholder does not crash", () => {
      fc.assert(
        fc.property(fc.string(), (placeholder) => {
          const { toJSON } = renderField({ placeholder })
          expect(toJSON()).toBeTruthy()
        }),
        { numRuns: 20 },
      )
    })
  })

  it("handles very long text (10K chars) without crash", () => {
    const longStr = "X".repeat(10_000)
    const { toJSON } = renderField({ label: longStr, placeholder: longStr, value: longStr })
    expect(toJSON()).toBeTruthy()
  })

  it("handles special characters without crash", () => {
    const specials = ['<script>alert("xss")</script>', "\u0000\u0001\u0002", "مرحبا", "🏥💉"]
    for (const str of specials) {
      const { toJSON } = renderField({ label: str, placeholder: str, value: str })
      expect(toJSON()).toBeTruthy()
    }
  })
})
