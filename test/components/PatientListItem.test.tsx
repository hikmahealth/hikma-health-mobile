import React from "react"
import { Image } from "react-native"
import { fireEvent } from "@testing-library/react-native"

// Mock all dependencies before importing the component
jest.mock("@nozbe/watermelondb/react", () => ({
  withObservables: jest.fn(() => (Component: any) => Component),
}))

jest.mock("../../app/db", () => ({
  default: {
    get: jest.fn(),
    collections: {
      get: jest.fn(),
    },
  },
}))

jest.mock("../../app/db/model/Patient", () => ({
  default: jest.fn(),
}))

jest.mock("../../app/db/model/Event", () => ({
  default: jest.fn(),
}))

jest.mock("../../app/db/model/Visit", () => ({
  default: jest.fn(),
}))

jest.mock("../../app/db/model/Appointment", () => ({
  default: jest.fn(),
}))

jest.mock("../../app/db/model/PatientAdditionalAttribute", () => ({
  default: jest.fn(),
}))

jest.mock("../../app/db/model/PatientRegistrationForm", () => ({
  RegistrationFormField: jest.fn(),
}))

jest.mock("../../app/store/provider", () => ({
  providerStore: {
    get: jest.fn(),
  },
}))

jest.mock("../../app/models/Event", () => ({
  default: {},
}))

jest.mock("../../app/models/PatientRegistrationForm", () => ({
  default: {},
}))

jest.mock("../../app/models/UserClinicPermissions", () => ({
  default: {},
}))

jest.mock("../../app/models/Visit", () => ({
  default: {},
}))

jest.mock("../../app/models/Patient", () => {
  const mockPatient = {
    DB: {
      fromDB: jest.fn((dbPatient: any) => ({
        ...dbPatient,
      })),
    },
    displayName: jest.fn((patient: any) => `${patient.givenName} ${patient.surname}`.trim()),
    displayNameAvatar: jest.fn((patient: any) => {
      const initials = `${patient.givenName?.[0] || ""}${patient.surname?.[0] || ""}`
      return initials.toUpperCase()
    }),
  }
  return {
    __esModule: true,
    default: mockPatient,
    ...mockPatient,
  }
})

jest.mock("../../app/i18n/translate", () => ({
  translate: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      "common:dob": "DOB",
      "common:sex": "Sex",
      "male": "Male",
      "female": "Female",
      "other": "Other",
    }
    return translations[key] || key
  }),
}))

jest.mock("../../app/utils/date", () => ({
  parseYYYYMMDD: jest.fn((dateString: string) => {
    if (!dateString) return null
    const [year, month, day] = dateString.split("-").map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    return new Date(year, month - 1, day)
  }),
  localeDate: jest.fn(
    (date: Date | string | number | null | undefined, dateFormat = "MMM dd, yyyy") => {
      if (!date) return ""
      let dateObj: Date
      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Parse YYYY-MM-DD format manually to avoid timezone issues
        const [year, month, day] = date.split("-").map(Number)
        dateObj = new Date(year, month - 1, day)
      } else {
        dateObj = new Date(date)
      }
      if (isNaN(dateObj.getTime())) return ""
      // Use require to avoid out-of-scope variable reference in jest.mock
      const { format } = require("date-fns")
      return format(dateObj, dateFormat)
    },
  ),
}))

jest.mock("uuid", () => ({
  v1: jest.fn(() => "mock-uuid-v1"),
  v4: jest.fn(() => "mock-uuid-v4"),
}))

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}))

jest.mock("effect", () => ({
  Either: {},
  Option: {
    Option: jest.fn(),
  },
}))

// Now import the component after all mocks are set up
import { PatientListItem, Avatar } from "../../app/components/PatientListItem"
import Patient from "../../app/models/Patient"
import { render } from "../helpers/renderWithProviders"

describe("PatientListItem", () => {
  const mockOnPatientSelected = jest.fn()
  const mockOnPatientLongPress = jest.fn()

  const createMockPatient = (overrides = {}): any => ({
    id: "patient-123",
    givenName: "John",
    surname: "Doe",
    dateOfBirth: "1990-05-15",
    sex: "male",
    citizenship: "USA",
    hometown: "New York",
    phone: "+1234567890",
    camp: "Camp A",
    photoUrl: "",
    governmentId: "GOV123",
    externalPatientId: "EXT123",
    additionalData: {},
    metadata: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-02"),
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Basic Rendering", () => {
    it("should render patient information correctly", () => {
      const patient = createMockPatient()
      const { getByText, getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("John Doe")).toBeTruthy()
      expect(getByText("DOB: 15 May 1990")).toBeTruthy()
      expect(getByText("Sex: Male")).toBeTruthy()
      expect(getByTestId(`patientListItem:${patient.id}`)).toBeTruthy()
    })

    it("should render patient with missing optional fields", () => {
      const patient = createMockPatient({
        dateOfBirth: "",
        sex: "",
      })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("John Doe")).toBeTruthy()
      expect(getByText("DOB:")).toBeTruthy()
      expect(getByText("Sex:")).toBeTruthy()
    })

    it("should handle invalid date of birth gracefully", () => {
      const patient = createMockPatient({
        dateOfBirth: "invalid-date",
      })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("John Doe")).toBeTruthy()
      expect(getByText("DOB:")).toBeTruthy()
    })

    it("should apply custom styles when provided", () => {
      const patient = createMockPatient()
      const customStyle = { backgroundColor: "red", padding: 20 }
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          style={customStyle}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      const pressable = getByTestId(`patientListItem:${patient.id}`)
      expect(pressable.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flex: 1, paddingVertical: 10, width: "100%" }),
          customStyle,
        ]),
      )
    })
  })

  describe("Avatar Component", () => {
    it("should render initials when no image URL is provided", () => {
      const patient = createMockPatient({ photoUrl: "" })
      const { getByText } = render(<Avatar patient={patient} />)

      expect(getByText("JD")).toBeTruthy()
    })

    it("should render image when URL is provided", () => {
      const patient = createMockPatient({ photoUrl: "https://example.com/photo.jpg" })
      const { UNSAFE_getByType } = render(
        <Avatar patient={patient} imageURL="https://example.com/photo.jpg" />,
      )

      const image = UNSAFE_getByType(Image)
      expect(image.props.source).toEqual({ uri: "https://example.com/photo.jpg" })
    })

    it("should apply custom size to avatar container", () => {
      const patient = createMockPatient()
      const { UNSAFE_getByType } = render(<Avatar patient={patient} size={80} />)
      const { View } = require("react-native")

      const views = UNSAFE_getByType(View)
      // The style is an array, check the last element which has the custom size
      const styleArray = views.props.style
      const customStyle = styleArray[styleArray.length - 1]
      expect(customStyle).toEqual(
        expect.objectContaining({
          height: 80,
          width: 80,
        }),
      )
    })

    it("should handle patients with single names correctly", () => {
      const patient = createMockPatient({ givenName: "Madonna", surname: "" })
      const { getByText } = render(<Avatar patient={patient} />)

      expect(getByText("M")).toBeTruthy()
    })
  })

  describe("User Interactions", () => {
    it("should call onPatientSelected when pressed", () => {
      const patient = createMockPatient()
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      fireEvent.press(getByTestId(`patientListItem:${patient.id}`))

      expect(mockOnPatientSelected).toHaveBeenCalledWith(
        patient.id,
        expect.objectContaining({
          id: patient.id,
          givenName: patient.givenName,
          surname: patient.surname,
        }),
      )
      expect(mockOnPatientSelected).toHaveBeenCalledTimes(1)
    })

    it("should call onPatientLongPress when long pressed", () => {
      const patient = createMockPatient()
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      fireEvent(getByTestId(`patientListItem:${patient.id}`), "longPress")

      expect(mockOnPatientLongPress).toHaveBeenCalledWith(patient.id)
      expect(mockOnPatientLongPress).toHaveBeenCalledTimes(1)
    })

    it("should not interfere between press and long press", () => {
      const patient = createMockPatient()
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      const pressable = getByTestId(`patientListItem:${patient.id}`)

      fireEvent.press(pressable)
      fireEvent(pressable, "longPress")

      expect(mockOnPatientSelected).toHaveBeenCalledTimes(1)
      expect(mockOnPatientLongPress).toHaveBeenCalledTimes(1)
    })
  })

  describe("RTL Support", () => {
    it("should render in LTR mode by default", () => {
      const patient = createMockPatient()
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      const pressable = getByTestId(`patientListItem:${patient.id}`)
      expect(pressable).toBeTruthy()
      // TODO: Fix RTL Tests
      // // The View with direction style is inside the pressable
      // // Access it through the children property
      // const viewWithDirection = pressable.children?.[0]

      // // Check if the view exists and has the expected style
      // expect(viewWithDirection).toBeTruthy()
      // const styleObj = Array.isArray(viewWithDirection?.props?.style)
      //   ? Object.assign({}, ...viewWithDirection.props.style)
      //   : viewWithDirection?.props?.style || {}

      // expect(styleObj).toMatchObject({
      //   flexDirection: "row",
      //   gap: 20,
      // })
    })

    it("should render in RTL mode when isRTL is true", () => {
      const patient = createMockPatient()
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
          isRTL={true}
        />,
      )

      const pressable = getByTestId(`patientListItem:${patient.id}`)

      expect(pressable).toBeTruthy()
      // TODO: Fix RTL Tests
      // The View with direction style is inside the pressable
      // Access it through the children property
      // const viewWithDirection = pressable.children?.[0]

      // // Check if the view exists and has the expected style
      // expect(viewWithDirection).toBeTruthy()
      // const styleObj = Array.isArray(viewWithDirection?.props?.style)
      //   ? Object.assign({}, ...viewWithDirection.props.style)
      //   : viewWithDirection?.props?.style || {}

      // expect(styleObj).toMatchObject({
      //   flexDirection: "row-reverse",
      //   gap: 20,
      // })
    })
  })

  describe("Sex Display", () => {
    it("should display male sex correctly", () => {
      const patient = createMockPatient({ sex: "male" })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("Sex: Male")).toBeTruthy()
    })

    it("should display female sex correctly", () => {
      const patient = createMockPatient({ sex: "female" })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("Sex: Female")).toBeTruthy()
    })

    it("should display other sex correctly", () => {
      const patient = createMockPatient({ sex: "other" })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("Sex: Other")).toBeTruthy()
    })

    it("should handle unknown sex values", () => {
      const patient = createMockPatient({ sex: "unknown" })
      const { getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByTestId("sex")).toBeTruthy()
    })
  })

  describe("Date Formatting", () => {
    it("should format various date formats correctly", () => {
      const testCases = [
        { date: "2000-01-01", expected: "01 Jan 2000" },
        { date: "1999-12-31", expected: "31 Dec 1999" },
        { date: "2023-06-15", expected: "15 Jun 2023" },
      ]

      testCases.forEach(({ date, expected }) => {
        const patient = createMockPatient({ dateOfBirth: date })
        const { getByText } = render(
          <PatientListItem
            patient={patient}
            onPatientSelected={mockOnPatientSelected}
            onPatientLongPress={mockOnPatientLongPress}
          />,
        )

        expect(getByText(`DOB: ${expected}`)).toBeTruthy()
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle very long names gracefully", () => {
      const patient = createMockPatient({
        givenName: "Verylongnamethatmightcauselayoutissues",
        surname: "Anotherlongsurnamethatcouldbreakthings",
      })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(
        getByText("Verylongnamethatmightcauselayoutissues Anotherlongsurnamethatcouldbreakthings"),
      ).toBeTruthy()
    })

    it("should handle special characters in names", () => {
      const patient = createMockPatient({
        givenName: "José",
        surname: "O'Brien",
      })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("José O'Brien")).toBeTruthy()
    })

    it("should handle empty names gracefully", () => {
      const patient = createMockPatient({
        givenName: "",
        surname: "",
      })

      // Mock the displayName to return empty string for empty names
      Patient.displayName.mockReturnValueOnce("")

      const { queryByText, getByTestId } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      // The component should still render even with empty name
      expect(getByTestId(`patientListItem:${patient.id}`)).toBeTruthy()
    })

    it("should handle future dates of birth", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}-${String(futureDate.getDate()).padStart(2, "0")}`

      const patient = createMockPatient({
        dateOfBirth: dateString,
      })
      const { getByText } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      // Should still display the date even if it's in the future
      expect(getByText(/DOB:/)).toBeTruthy()
    })
  })

  describe("Performance and Memoization", () => {
    it("should memoize expensive computations", () => {
      const patient = createMockPatient()
      const displayNameSpy = jest.spyOn(Patient, "displayName")

      const { rerender } = render(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      const initialCallCount = displayNameSpy.mock.calls.length

      // Re-render with same patient data
      rerender(
        <PatientListItem
          patient={patient}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      // displayName should not be called again for the same patient
      expect(displayNameSpy.mock.calls.length).toBe(initialCallCount)

      displayNameSpy.mockRestore()
    })

    it("should re-render when patient data changes", () => {
      const patient1 = createMockPatient({ givenName: "John" })
      const patient2 = createMockPatient({ givenName: "Jane" })

      // Set up the mock to return the correct display names
      Patient.displayName.mockImplementation((patient: any) =>
        `${patient.givenName} ${patient.surname}`.trim(),
      )

      const { rerender, getByText } = render(
        <PatientListItem
          patient={patient1}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("John Doe")).toBeTruthy()

      rerender(
        <PatientListItem
          patient={patient2}
          onPatientSelected={mockOnPatientSelected}
          onPatientLongPress={mockOnPatientLongPress}
        />,
      )

      expect(getByText("Jane Doe")).toBeTruthy()
    })
  })
})
