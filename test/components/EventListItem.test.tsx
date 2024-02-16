import React from "react"
import { EventListItem } from "../../app/components"
import { render } from "@testing-library/react-native"

describe("EventListItem component", () => {
  test("EventListItem component renders correctly", () => {
    const { getByTestId } = render(<EventListItem event={{}} />)
    expect(getByTestId("eventListItem")).toBeTruthy()
  })
})
