import * as React from "react"
import { render } from "@testing-library/react-native"
import { Text } from "../../app/components/Text"
import { typography } from "../../app/theme"
import { translate } from "../../app/i18n"
import { flattenDeep } from "lodash"

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

describe("Text component", () => {
  it("renders plain text correctly", () => {
    const { getByText } = render(<Text text="Hello" />)
    expect(getByText("Hello")).toBeTruthy()
  })

  it("renders translated text using tx prop", () => {
    const { getByText } = render(<Text tx="common.ok" />)
    expect(getByText("translated_common.ok")).toBeTruthy()
    expect(translate).toHaveBeenCalledWith("common.ok", undefined)
  })

  it("renders translated text with options", () => {
    const options = { name: "John" }
    render(<Text tx="common.greeting" txOptions={options} />)
    expect(translate).toHaveBeenCalledWith("common.greeting", options)
  })

  it("renders children as text content", () => {
    const { getByText } = render(<Text>Child Text</Text>)
    expect(getByText("Child Text")).toBeTruthy()
  })

  it("applies preset styles correctly", () => {
    const { getByText } = render(<Text text="Heading" preset="heading" />)
    const textElement = getByText("Heading")
    const style = flattenDeep(textElement.props.style)

    // Check if style array contains objects with the expected properties
    expect(style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 36 }),
        expect.objectContaining({ lineHeight: 44 }),
      ]),
    )
  })

  it("applies custom text color", () => {
    const { getByText } = render(<Text text="Colored" color="#FF0000" />)
    const textElement = getByText("Colored")
    const style = flattenDeep(textElement.props.style)

    expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ color: "#FF0000" })]))
  })

  it("applies custom size correctly", () => {
    const { getByText } = render(<Text text="Large" size="lg" />)
    const textElement = getByText("Large")
    const style = flattenDeep(textElement.props.style)

    expect(style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontSize: 20 }),
        expect.objectContaining({ lineHeight: 32 }),
      ]),
    )
  })

  it("applies custom weight correctly", () => {
    const { getByText } = render(<Text text="Bold" weight="bold" />)
    const textElement = getByText("Bold")
    const style = flattenDeep(textElement.props.style)

    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontFamily: typography.primary.bold })]),
    )
  })

  it("applies text decoration line correctly", () => {
    const { getByText } = render(<Text text="Underlined" textDecorationLine="underline" />)
    const textElement = getByText("Underlined")
    const style = flattenDeep(textElement.props.style)

    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ textDecorationLine: "underline" })]),
    )
  })

  it("applies text alignment correctly", () => {
    const { getByText } = render(<Text text="Centered" align="center" />)
    const textElement = getByText("Centered")
    const style = textElement.props.style

    expect(style).toEqual(
      expect.arrayContaining([expect.objectContaining({ textAlign: "center" })]),
    )
  })

  it("applies custom style override", () => {
    const customStyle = { marginTop: 10 }
    const { getByText } = render(<Text text="Custom Style" style={customStyle} />)
    const textElement = getByText("Custom Style")
    const style = textElement.props.style

    expect(style).toEqual(expect.arrayContaining([expect.objectContaining(customStyle)]))
  })
})
