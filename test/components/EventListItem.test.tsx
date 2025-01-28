import React from "react"
import { EventListItem } from "../../app/components"
import { render, fireEvent } from "@testing-library/react-native"
import EventModel from "../../app/db/model/Event"
import { Observable } from "rxjs"

const mockEventData = {
  eventType: "Vital Signs",
  createdAt: 1706472000000, // 2025-01-28 12:00:00
  formData: [
    { fieldId: "1", inputType: "number", name: "Blood Pressure", value: "120/80" },
    { fieldId: "2", inputType: "number", name: "Temperature", value: "37.5" },
  ],
}

// Mock WatermelonDB
jest.mock("@nozbe/watermelondb/react", () => ({
  withObservables: (_triggers: string[], _fn: Function) => (component: any) => component,
}))

// Mock EventModel
jest.mock("../../app/db/model/Event", () => {
  class MockEventModel {
    static table = "events"

    observe() {
      return {
        subscribe: (observer: any) => {
          observer.next(mockEventData)
          return { unsubscribe: () => {} }
        },
      }
    }
  }
  return MockEventModel
})

describe("EventListItem component", () => {
  const now = new Date()
  const mockEvent = {
    eventType: "Vital Signs",
    createdAt: now.getTime(), // 2025-01-28 12:00:00
    formData: [
      { fieldId: "1", inputType: "number", name: "Blood Pressure", value: "120/80" },
      { fieldId: "2", inputType: "number", name: "Temperature", value: "37.5" },
    ],
  }

  const mockEventModel = {
    ...mockEvent,
    observe: () => ({
      subscribe: (observer: any) => {
        observer.next(mockEvent)
        return { unsubscribe: () => {} }
      },
    }),
  } as unknown as EventModel

  const mockOpenEventOptions = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders event type and time correctly", () => {
    const { getByText } = render(
      <EventListItem
        event={mockEventModel}
        openEventOptions={mockOpenEventOptions}
        language="en"
      />,
    )
    const timeString = `${(now.getHours() % 12 || 12).toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")} ${now.getHours() < 12 ? "AM" : "PM"}`

    expect(getByText(`Vital Signs, ${timeString}`)).toBeTruthy()
  })

  it("calls openEventOptions when long pressed", () => {
    const { getByTestId } = render(
      <EventListItem
        event={mockEventModel}
        openEventOptions={mockOpenEventOptions}
        language="en"
      />,
    )

    fireEvent(getByTestId("eventListItem"), "longPress")
    expect(mockOpenEventOptions).toHaveBeenCalledWith(mockEventModel)
  })

  it("displays form data correctly", () => {
    const { getByText } = render(
      <EventListItem
        event={mockEventModel}
        openEventOptions={mockOpenEventOptions}
        language="en"
      />,
    )

    expect(getByText("Blood Pressure:")).toBeTruthy()
    expect(getByText("120/80")).toBeTruthy()
    expect(getByText("Temperature:")).toBeTruthy()
    expect(getByText("37.5")).toBeTruthy()
  })

  it("handles events with no form data", () => {
    const emptyEvent = {
      ...mockEvent,
      formData: [],
      observe: () => ({
        subscribe: (observer: any) => {
          observer.next({ ...mockEvent, formData: [] })
          return { unsubscribe: () => {} }
        },
      }),
    } as unknown as EventModel

    const { getByTestId } = render(
      <EventListItem event={emptyEvent} openEventOptions={mockOpenEventOptions} language="en" />,
    )

    expect(getByTestId("eventListItem")).toBeTruthy()
  })
})
