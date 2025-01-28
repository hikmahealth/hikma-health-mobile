import { AutoImage, useAutoImage } from "../../app/components"
import { Image, Platform } from "react-native"
import { renderHook } from "@testing-library/react-hooks"
import { render } from "@testing-library/react-native"
import React from "react"

describe("useAutoImage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Image.getSize
    Image.getSize = jest.fn((uri, callback) => callback(100, 50))
  })

  it("should return [0, 0] for invalid image uri", () => {
    const { result } = renderHook(() => useAutoImage(""))
    expect(result.current).toEqual([0, 0])
  })

  it("should return original dimensions when no constraints provided", () => {
    const { result } = renderHook(() => useAutoImage("https://test.com/image.jpg"))
    expect(result.current).toEqual([100, 50])
  })

  it("should scale width proportionally when maxWidth is provided", () => {
    const { result } = renderHook(() => useAutoImage("https://test.com/image.jpg", [50, undefined]))
    expect(result.current).toEqual([50, 25])
  })

  it("should scale height proportionally when maxHeight is provided", () => {
    const { result } = renderHook(() => useAutoImage("https://test.com/image.jpg", [undefined, 25]))
    expect(result.current).toEqual([50, 25])
  })

  it("should maintain aspect ratio when both maxWidth and maxHeight are provided", () => {
    const { result } = renderHook(() => useAutoImage("https://test.com/image.jpg", [40, 30]))
    // Should scale down to fit within constraints while maintaining aspect ratio
    expect(result.current).toEqual([40, 20])
  })
})

describe("AutoImage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Image.getSize = jest.fn((uri, callback) => callback(100, 50))
    Platform.select = jest.fn((options) => options.default)
  })

  it("should render with correct dimensions", () => {
    const { getByTestId } = render(
      <AutoImage source={{ uri: "https://test.com/image.jpg" }} testID="test-image" />,
    )

    const image = getByTestId("test-image")
    expect(image.props.style).toEqual(
      expect.objectContaining({
        width: 100,
        height: 50,
      }),
    )
  })

  it("should render with maxWidth constraint", () => {
    const { getByTestId } = render(
      <AutoImage
        source={{ uri: "https://test.com/image.jpg" }}
        maxWidth={50}
        testID="test-image"
      />,
    )

    const image = getByTestId("test-image")
    expect(image.props.style).toEqual(
      expect.objectContaining({
        width: 50,
        height: 25,
      }),
    )
  })

  it("should handle web platform URI differently", () => {
    Platform.select = jest.fn((options) => options.web)

    const { getByTestId } = render(
      <AutoImage source={{ uri: "https://test.com/image.jpg" }} testID="test-image" />,
    )

    expect(Platform.select).toHaveBeenCalledWith({
      web: "https://test.com/image.jpg",
      default: "https://test.com/image.jpg",
    })
  })

  it("should pass through additional Image props", () => {
    const { getByTestId } = render(
      <AutoImage
        source={{ uri: "https://test.com/image.jpg" }}
        testID="test-image"
        resizeMode="contain"
      />,
    )

    const image = getByTestId("test-image")
    expect(image.props.resizeMode).toBe("contain")
  })
})
