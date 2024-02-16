// Test the component
import * as React from "react"
import { render } from "@testing-library/react-native"
import { Text } from "../../app/components/Text"

// test("Text component renders correctly", () => {
//   const { getByText } = render(<Text tx="edit" />)
//   expect(getByText("common.ok")).toBeTruthy()
// })

describe("Text component", () => {
  test("Text component renders correctly", () => {
    const { getByText } = render(<Text text="edit" />)
    expect(getByText("edit")).toBeTruthy()
  })
})
