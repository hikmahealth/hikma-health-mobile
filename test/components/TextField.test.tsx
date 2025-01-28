import * as React from "react"
import { TextField } from "../../app/components/TextField"
import { render, fireEvent } from "@testing-library/react-native"
import { Text, TextInput, View } from "react-native"
import { translate } from "../../app/i18n"
import { colors } from "../../app/theme"

// Mock the mobx-react-lite observer
jest.mock("mobx-react-lite", () => ({
  observer: (component: any) => component,
}))

// Mock the useStores hook
jest.mock("../../app/models", () => ({
  useStores: () => ({
    language: {
      isRTL: false,
      current: "en",
    },
  }),
}))

// Mock the i18n translate function
jest.mock("../../app/i18n", () => ({
  translate: jest.fn((key) => `translated_${key}`),
}))

describe("TextField", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders with default props", () => {
    const { getByTestId } = render(<TextField testID="test-input" />)
    expect(getByTestId("test-input")).toBeTruthy()
  })

  it("renders label correctly", () => {
    const { getByText } = render(<TextField label="Username" />)
    expect(getByText("Username")).toBeTruthy()
  })

  it("renders translated label", () => {
    const { getByText } = render(<TextField labelTx="field.username" />)
    expect(getByText("translated_field.username")).toBeTruthy()
    expect(translate).toHaveBeenCalledWith("field.username", undefined)
  })

  it("renders helper text", () => {
    const { getByText } = render(<TextField helper="Enter your username" />)
    expect(getByText("Enter your username")).toBeTruthy()
  })

  it("renders translated helper text", () => {
    const { getByText } = render(<TextField helperTx="field.helper" />)
    expect(getByText("translated_field.helper")).toBeTruthy()
    expect(translate).toHaveBeenCalledWith("field.helper", undefined)
  })

  it("renders placeholder", () => {
    const { getByPlaceholderText } = render(<TextField placeholder="Type here..." />)
    expect(getByPlaceholderText("Type here...")).toBeTruthy()
  })

  it("renders translated placeholder", () => {
    const { getByPlaceholderText } = render(<TextField placeholderTx="field.placeholder" />)
    expect(getByPlaceholderText("translated_field.placeholder")).toBeTruthy()
    expect(translate).toHaveBeenCalledWith("field.placeholder", undefined)
  })

  it("handles text input correctly", () => {
    const onChangeText = jest.fn()
    const { getByTestId } = render(<TextField testID="test-input" onChangeText={onChangeText} />)

    const input = getByTestId("test-input")
    fireEvent.changeText(input, "test input")

    expect(onChangeText).toHaveBeenCalledWith("test input")
  })

  it("applies error status styles", () => {
    const { getByTestId } = render(<TextField status="error" testID="test-input" />)
    const inputWrapper = getByTestId("input-wrapper")

    expect(inputWrapper.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderColor: colors.error,
        }),
      ]),
    )
  })

  it("handles disabled state", () => {
    const { getByTestId } = render(<TextField editable={false} testID="test-input" />)
    const input = getByTestId("test-input")

    expect(input.props.editable).toBe(false)
  })

  it("renders with right accessory", () => {
    const RightAccessory = jest.fn(() => <View testID="right-accessory" />)
    const { getByTestId } = render(<TextField RightAccessory={RightAccessory} />)

    expect(getByTestId("right-accessory")).toBeTruthy()
    expect(RightAccessory).toHaveBeenCalled()
  })

  it("renders with left accessory", () => {
    const LeftAccessory = jest.fn(() => <View testID="left-accessory" />)
    const { getByTestId } = render(<TextField LeftAccessory={LeftAccessory} />)

    expect(getByTestId("left-accessory")).toBeTruthy()
    expect(LeftAccessory).toHaveBeenCalled()
  })

  it("handles multiline input", () => {
    const { getByTestId } = render(<TextField multiline testID="test-input" />)
    const input = getByTestId("test-input")
    const inputWrapper = getByTestId("input-wrapper")

    expect(input.props.multiline).toBe(true)
    expect(inputWrapper.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          minHeight: 112,
        }),
      ]),
    )
  })

  it("applies custom style overrides", () => {
    const customStyle = { backgroundColor: "red" }
    const { getByTestId } = render(<TextField testID="test-input" style={customStyle} />)
    const input = getByTestId("test-input")

    expect(input.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)]),
    )
  })
})
