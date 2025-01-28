import React from "react"
import { render } from "@testing-library/react-native"
import { If } from "../../app/components/If"
import { Text } from "react-native"

describe("If component", () => {
  it("renders children when condition is true", () => {
    const { getByText } = render(
      <If condition={true}>
        <Text>Rendered content</Text>
      </If>,
    )
    expect(getByText("Rendered content")).toBeTruthy()
  })

  it("does not render children when condition is false", () => {
    const { queryByText } = render(
      <If condition={false}>
        <Text>Rendered content</Text>
      </If>,
    )
    expect(queryByText("Rendered content")).toBeNull()
  })

  it("renders fallback when condition is false and fallback is provided", () => {
    const { getByText } = render(
      <If condition={false} fallback={<Text>Fallback content</Text>}>
        <Text>Rendered content</Text>
      </If>,
    )
    expect(getByText("Fallback content")).toBeTruthy()
  })
})
