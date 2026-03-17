import { If } from "../../app/components/If"
import { Text } from "../../app/components/Text"
import { View } from "../../app/components/View"
// Using custom render helper that wraps components with ThemeProvider
// This is required because our Text and View components use the theme context
import { render } from "../helpers/renderWithProviders"

describe("If Component", () => {
  describe("when condition is true", () => {
    it("should render children", () => {
      const { getByText } = render(
        <If condition={true}>
          <Text>Child content</Text>
        </If>,
      )

      expect(getByText("Child content")).toBeTruthy()
    })

    it("should render multiple children", () => {
      const { getByText } = render(
        <If condition={true}>
          <Text>First child</Text>
          <Text>Second child</Text>
        </If>,
      )

      expect(getByText("First child")).toBeTruthy()
      expect(getByText("Second child")).toBeTruthy()
    })

    it("should render complex component trees", () => {
      const { getByText, getByTestId } = render(
        <If condition={true}>
          <View testID="container">
            <Text>Nested text</Text>
            <View>
              <Text>Deeply nested</Text>
            </View>
          </View>
        </If>,
      )

      expect(getByTestId("container")).toBeTruthy()
      expect(getByText("Nested text")).toBeTruthy()
      expect(getByText("Deeply nested")).toBeTruthy()
    })

    it("should ignore fallback when condition is true", () => {
      const { getByText, queryByText } = render(
        <If condition={true} fallback={<Text>Fallback content</Text>}>
          <Text>Main content</Text>
        </If>,
      )

      expect(getByText("Main content")).toBeTruthy()
      expect(queryByText("Fallback content")).toBeNull()
    })
  })

  describe("when condition is false", () => {
    it("should not render children", () => {
      const { queryByText } = render(
        <If condition={false}>
          <Text>Child content</Text>
        </If>,
      )

      expect(queryByText("Child content")).toBeNull()
    })

    it("should render fallback when provided", () => {
      const { getByText, queryByText } = render(
        <If condition={false} fallback={<Text>Fallback content</Text>}>
          <Text>Main content</Text>
        </If>,
      )

      expect(queryByText("Main content")).toBeNull()
      expect(getByText("Fallback content")).toBeTruthy()
    })

    it("should render complex fallback components", () => {
      const { getByText, getByTestId, queryByText } = render(
        <If
          condition={false}
          fallback={
            <View testID="fallback-container">
              <Text>Fallback title</Text>
              <Text>Fallback description</Text>
            </View>
          }
        >
          <Text>Main content</Text>
        </If>,
      )

      expect(queryByText("Main content")).toBeNull()
      expect(getByTestId("fallback-container")).toBeTruthy()
      expect(getByText("Fallback title")).toBeTruthy()
      expect(getByText("Fallback description")).toBeTruthy()
    })

    it("should render nothing when no fallback is provided", () => {
      const { queryByText } = render(
        <If condition={false}>
          <Text>Child content</Text>
        </If>,
      )

      // Should not render children when condition is false and no fallback
      expect(queryByText("Child content")).toBeNull()
    })
  })

  describe("dynamic conditions", () => {
    it("should handle condition changes from true to false", () => {
      const { rerender, queryByText } = render(
        <If condition={true}>
          <Text>Dynamic content</Text>
        </If>,
      )

      expect(queryByText("Dynamic content")).toBeTruthy()

      rerender(
        <If condition={false}>
          <Text>Dynamic content</Text>
        </If>,
      )

      expect(queryByText("Dynamic content")).toBeNull()
    })

    it("should handle condition changes from false to true", () => {
      const { rerender, queryByText } = render(
        <If condition={false}>
          <Text>Dynamic content</Text>
        </If>,
      )

      expect(queryByText("Dynamic content")).toBeNull()

      rerender(
        <If condition={true}>
          <Text>Dynamic content</Text>
        </If>,
      )

      expect(queryByText("Dynamic content")).toBeTruthy()
    })

    it("should switch between children and fallback on condition change", () => {
      const { rerender, queryByText, getByText } = render(
        <If condition={true} fallback={<Text>Fallback</Text>}>
          <Text>Main</Text>
        </If>,
      )

      expect(getByText("Main")).toBeTruthy()
      expect(queryByText("Fallback")).toBeNull()

      rerender(
        <If condition={false} fallback={<Text>Fallback</Text>}>
          <Text>Main</Text>
        </If>,
      )

      expect(queryByText("Main")).toBeNull()
      expect(getByText("Fallback")).toBeTruthy()
    })
  })

  describe("edge cases", () => {
    it("should handle null children gracefully", () => {
      // Should render without error
      expect(() => render(<If condition={true}>{null}</If>)).not.toThrow()
    })

    it("should handle undefined children gracefully", () => {
      // Should render without error
      expect(() => render(<If condition={true}>{undefined}</If>)).not.toThrow()
    })

    it("should handle null fallback when condition is false", () => {
      const { queryByText } = render(
        <If condition={false} fallback={null}>
          <Text>Main content</Text>
        </If>,
      )

      // Should not render main content when condition is false
      expect(queryByText("Main content")).toBeNull()
    })

    it("should handle undefined fallback when condition is false", () => {
      const { queryByText } = render(
        <If condition={false} fallback={undefined}>
          <Text>Main content</Text>
        </If>,
      )

      // Should not render main content when condition is false
      expect(queryByText("Main content")).toBeNull()
    })

    it("should work with boolean expressions as conditions", () => {
      const value = 5
      const { getByText } = render(
        <If condition={value > 3}>
          <Text>Value is greater than 3</Text>
        </If>,
      )

      expect(getByText("Value is greater than 3")).toBeTruthy()
    })

    it("should work with falsy values as conditions", () => {
      const testCases = [
        { value: 0, expected: false },
        { value: "", expected: false },
        { value: null, expected: false },
        { value: undefined, expected: false },
        { value: false, expected: false },
        { value: NaN, expected: false },
      ]

      testCases.forEach(({ value }) => {
        const { queryByText } = render(
          <If condition={value as any}>
            <Text>Should not render</Text>
          </If>,
        )

        expect(queryByText("Should not render")).toBeNull()
      })
    })

    it("should work with truthy values as conditions", () => {
      const testCases = [
        { value: 1, expected: true },
        { value: "string", expected: true },
        { value: [], expected: true },
        { value: {}, expected: true },
        { value: true, expected: true },
      ]

      testCases.forEach(({ value }, index) => {
        const { getByText } = render(
          <If condition={value as any}>
            <Text>Should render {index}</Text>
          </If>,
        )

        expect(getByText(`Should render ${index}`)).toBeTruthy()
      })
    })
  })
})
