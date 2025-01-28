import React from "react"
import { render, fireEvent } from "@testing-library/react-native"
import { Fab } from "../../app/components/Fab"
import { LucideIcon } from "lucide-react-native"

describe("Fab Component", () => {
  const mockIcon: LucideIcon = () => null
  const mockOnPress = jest.fn()

  test("renders correctly", () => {
    const { getByTestId } = render(<Fab Icon={mockIcon} onPress={mockOnPress} testID="fab" />)
    expect(getByTestId("fab")).toBeTruthy()
  })

  test("calls onPress when pressed", () => {
    const { getByTestId } = render(<Fab Icon={mockIcon} onPress={mockOnPress} testID="fab" />)
    fireEvent.press(getByTestId("fab"))
    expect(mockOnPress).toHaveBeenCalledTimes(1)
  })

  test("applies custom style", () => {
    const customStyle = { backgroundColor: "red" }
    const { getByTestId } = render(
      <Fab Icon={mockIcon} onPress={mockOnPress} style={customStyle} testID="fab" />,
    )
    const fabElement = getByTestId("fab")
    expect(fabElement.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)]),
    )
  })

  test("renders the icon", () => {
    const { UNSAFE_getByType } = render(<Fab Icon={mockIcon} onPress={mockOnPress} />)
    expect(UNSAFE_getByType(mockIcon)).toBeTruthy()
  })
})
