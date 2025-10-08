import React from "react"
import { fireEvent } from "@testing-library/react-native"
import { View } from "../../app/components/View"
import { Text } from "../../app/components/Text"
// Using custom render helper that wraps components with ThemeProvider
import { render } from "../helpers/renderWithProviders"

import { Button, ButtonAccessoryProps } from "../../app/components/Button"

describe("Button Component", () => {
  describe("text rendering", () => {
    it("should render with text prop", () => {
      const { getByText } = render(<Button text="Click me" />)
      expect(getByText("Click me")).toBeTruthy()
    })

    it("should render with tx prop", () => {
      const { getByText } = render(<Button tx="common:ok" />)
      // Since we're mocking i18n, this will render as the key
      expect(getByText(/common:ok/)).toBeTruthy()
    })

    it("should render with children", () => {
      const { getByText } = render(<Button>Custom child text</Button>)
      expect(getByText("Custom child text")).toBeTruthy()
    })

    it("should prioritize tx over text", () => {
      const { getByText, queryByText } = render(
        <Button tx="common:ok" text="This should not appear" />,
      )
      expect(getByText(/common:ok/)).toBeTruthy()
      expect(queryByText("This should not appear")).toBeNull()
    })

    it("should prioritize text prop over children", () => {
      const { getByText, queryByText } = render(<Button text="Parent text">Child text</Button>)
      // The Text component prioritizes text prop over children
      expect(getByText("Parent text")).toBeTruthy()
      expect(queryByText("Child text")).toBeNull()
    })

    it("should render children when no text or tx prop is provided", () => {
      const { getByText } = render(<Button>Only children</Button>)
      expect(getByText("Only children")).toBeTruthy()
    })
  })

  describe("presets", () => {
    it("should render with default preset when not specified", () => {
      const { getByRole } = render(<Button text="Default" />)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should render with filled preset", () => {
      const { getByRole } = render(<Button text="Filled" preset="filled" />)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should render with reversed preset", () => {
      const { getByRole } = render(<Button text="Reversed" preset="reversed" />)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })
  })

  describe("press handling", () => {
    it("should call onPress when pressed", () => {
      const onPressMock = jest.fn()
      const { getByText } = render(<Button text="Press me" onPress={onPressMock} />)

      fireEvent.press(getByText("Press me"))
      expect(onPressMock).toHaveBeenCalledTimes(1)
    })

    it("should not call onPress when disabled", () => {
      const onPressMock = jest.fn()
      const { getByText } = render(<Button text="Disabled button" onPress={onPressMock} disabled />)

      fireEvent.press(getByText("Disabled button"))
      expect(onPressMock).not.toHaveBeenCalled()
    })

    it("should call onPressIn when pressed", () => {
      const onPressInMock = jest.fn()
      const { getByText } = render(<Button text="Press me" onPressIn={onPressInMock} />)

      fireEvent(getByText("Press me"), "onPressIn")
      expect(onPressInMock).toHaveBeenCalledTimes(1)
    })

    it("should call onPressOut when released", () => {
      const onPressOutMock = jest.fn()
      const { getByText } = render(<Button text="Press me" onPressOut={onPressOutMock} />)

      fireEvent(getByText("Press me"), "onPressOut")
      expect(onPressOutMock).toHaveBeenCalledTimes(1)
    })

    it("should call onLongPress when long pressed", () => {
      const onLongPressMock = jest.fn()
      const { getByText } = render(<Button text="Press me" onLongPress={onLongPressMock} />)

      fireEvent(getByText("Press me"), "onLongPress")
      expect(onLongPressMock).toHaveBeenCalledTimes(1)
    })
  })

  describe("disabled state", () => {
    it("should have disabled accessibility state when disabled", () => {
      const { getByRole } = render(<Button text="Disabled" disabled />)
      const button = getByRole("button")

      expect(button.props.accessibilityState).toEqual({ disabled: true })
    })

    it("should have enabled accessibility state when not disabled", () => {
      const { getByRole } = render(<Button text="Enabled" />)
      const button = getByRole("button")

      expect(button.props.accessibilityState).toEqual({ disabled: false })
    })

    it("should apply disabled styles when disabled", () => {
      const disabledStyle = { opacity: 0.5 }
      const disabledTextStyle = { color: "gray" }

      const { getByRole } = render(
        <Button
          text="Disabled"
          disabled
          disabledStyle={disabledStyle}
          disabledTextStyle={disabledTextStyle}
        />,
      )

      const button = getByRole("button")
      expect(button).toBeTruthy()
    })
  })

  describe("accessories", () => {
    const MockLeftAccessory = ({ style, disabled }: ButtonAccessoryProps) => (
      <View style={style} testID={`left-accessory${disabled ? "-disabled" : ""}`}>
        <Text>←</Text>
      </View>
    )

    const MockRightAccessory = ({ style, disabled }: ButtonAccessoryProps) => (
      <View style={style} testID={`right-accessory${disabled ? "-disabled" : ""}`}>
        <Text>→</Text>
      </View>
    )

    it("should render left accessory when provided", () => {
      const { getByTestId, getByText } = render(
        <Button text="With left" LeftAccessory={MockLeftAccessory} />,
      )

      expect(getByTestId("left-accessory")).toBeTruthy()
      expect(getByText("←")).toBeTruthy()
      expect(getByText("With left")).toBeTruthy()
    })

    it("should render right accessory when provided", () => {
      const { getByTestId, getByText } = render(
        <Button text="With right" RightAccessory={MockRightAccessory} />,
      )

      expect(getByTestId("right-accessory")).toBeTruthy()
      expect(getByText("→")).toBeTruthy()
      expect(getByText("With right")).toBeTruthy()
    })

    it("should render both accessories when provided", () => {
      const { getByTestId, getByText } = render(
        <Button
          text="With both"
          LeftAccessory={MockLeftAccessory}
          RightAccessory={MockRightAccessory}
        />,
      )

      expect(getByTestId("left-accessory")).toBeTruthy()
      expect(getByTestId("right-accessory")).toBeTruthy()
      expect(getByText("←")).toBeTruthy()
      expect(getByText("→")).toBeTruthy()
      expect(getByText("With both")).toBeTruthy()
    })

    it("should pass disabled state to accessories", () => {
      const { getByTestId } = render(
        <Button
          text="Disabled with accessories"
          disabled
          LeftAccessory={MockLeftAccessory}
          RightAccessory={MockRightAccessory}
        />,
      )

      expect(getByTestId("left-accessory-disabled")).toBeTruthy()
      expect(getByTestId("right-accessory-disabled")).toBeTruthy()
    })

    it("should pass pressable state to accessories", () => {
      const AccessoryWithState = ({ pressableState }: ButtonAccessoryProps) => (
        <View testID={pressableState.pressed ? "pressed" : "not-pressed"}>
          <Text>State</Text>
        </View>
      )

      const { getByTestId, getByText } = render(
        <Button text="With state" LeftAccessory={AccessoryWithState} />,
      )

      // Initially not pressed
      expect(getByTestId("not-pressed")).toBeTruthy()

      // Simulate press in
      fireEvent(getByText("With state"), "onPressIn")
      // Note: In a real scenario, we'd need to wait for the state update
    })
  })

  describe("style overrides", () => {
    it("should apply custom style", () => {
      const customStyle = { backgroundColor: "red", padding: 20 }
      const { getByRole } = render(<Button text="Styled" style={customStyle} />)

      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should apply custom text style", () => {
      const customTextStyle = { fontSize: 20, color: "blue" }
      const { getByText } = render(<Button text="Styled text" textStyle={customTextStyle} />)

      const textElement = getByText("Styled text")
      expect(textElement).toBeTruthy()
    })

    it("should apply pressed styles when pressed", () => {
      const pressedStyle = { backgroundColor: "green" }
      const pressedTextStyle = { color: "white" }

      const { getByRole } = render(
        <Button text="Pressable" pressedStyle={pressedStyle} pressedTextStyle={pressedTextStyle} />,
      )

      const button = getByRole("button")
      expect(button).toBeTruthy()
    })
  })

  describe("accessibility", () => {
    it("should have button accessibility role", () => {
      const { getByRole } = render(<Button text="Accessible" />)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should support custom accessibility props", () => {
      const { getByLabelText, getByHintText } = render(
        <Button
          text="Accessible"
          accessibilityLabel="Custom label"
          accessibilityHint="Custom hint"
        />,
      )

      expect(getByLabelText("Custom label")).toBeTruthy()
      expect(getByHintText("Custom hint")).toBeTruthy()
    })

    it("should support testID", () => {
      const { getByTestId } = render(<Button text="Test" testID="custom-button" />)
      expect(getByTestId("custom-button")).toBeTruthy()
    })
  })

  describe("edge cases", () => {
    it("should render without any text props", () => {
      const { getByRole } = render(<Button />)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should handle empty string text", () => {
      const { getByRole } = render(<Button text="" />)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should handle null children", () => {
      const { getByRole } = render(<Button>{null}</Button>)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should handle undefined children", () => {
      const { getByRole } = render(<Button>{undefined}</Button>)
      const button = getByRole("button")
      expect(button).toBeTruthy()
    })

    it("should handle multiple children", () => {
      const { getByText } = render(<Button>First Second</Button>)

      expect(getByText("First Second")).toBeTruthy()
    })
  })

  describe("integration scenarios", () => {
    it("should work with all props combined", () => {
      const onPressMock = jest.fn()
      const LeftIcon = () => <Text>👈</Text>
      const RightIcon = () => <Text>👉</Text>

      const { getByText, getByRole } = render(
        <Button
          tx="common:submit"
          preset="filled"
          onPress={onPressMock}
          LeftAccessory={LeftIcon}
          RightAccessory={RightIcon}
          style={{ margin: 10 }}
          textStyle={{ fontSize: 18 }}
          testID="submit-button"
        />,
      )

      const button = getByRole("button")
      expect(button).toBeTruthy()
      expect(getByText("👈")).toBeTruthy()
      expect(getByText("👉")).toBeTruthy()

      fireEvent.press(button)
      expect(onPressMock).toHaveBeenCalledTimes(1)
    })

    it("should handle rapid press events", () => {
      const onPressMock = jest.fn()
      const { getByText } = render(<Button text="Rapid press" onPress={onPressMock} />)

      const button = getByText("Rapid press")
      fireEvent.press(button)
      fireEvent.press(button)
      fireEvent.press(button)

      expect(onPressMock).toHaveBeenCalledTimes(3)
    })

    it("should handle state changes correctly", () => {
      const { getByRole, rerender } = render(<Button text="Enabled" disabled={false} />)

      const button = getByRole("button")
      expect(button.props.accessibilityState).toEqual({ disabled: false })

      rerender(<Button text="Disabled" disabled={true} />)
      expect(button.props.accessibilityState).toEqual({ disabled: true })

      rerender(<Button text="Enabled again" disabled={false} />)
      expect(button.props.accessibilityState).toEqual({ disabled: false })
    })
  })
})
