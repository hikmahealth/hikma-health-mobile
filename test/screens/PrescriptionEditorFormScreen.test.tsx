import React from "react"
import { fireEvent, waitFor } from "@testing-library/react-native"
import { render } from "../helpers/renderWithProviders"
import { PrescriptionEditorFormScreen } from "../../app/screens/PrescriptionEditorFormScreen"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Native modules used by Screen component
jest.mock("react-native-keyboard-controller", () => {
  const RN = require("react-native")
  return {
    KeyboardAwareScrollView: RN.ScrollView,
    KeyboardProvider: ({ children }: any) => children,
  }
})

jest.mock("react-native-edge-to-edge", () => ({
  SystemBars: () => null,
}))

jest.mock("expo-screen-orientation", () => ({
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  removeOrientationChangeListener: jest.fn(),
  getOrientationAsync: jest.fn(() => Promise.resolve(1)),
  OrientationLock: { DEFAULT: 0 },
  Orientation: { PORTRAIT_UP: 1 },
}))

// providerStore + xstate selector
jest.mock("@xstate/react", () => ({
  useSelector: jest.fn((_store: any, selector: (state: any) => any) => {
    const { Option } = require("effect")
    return selector({
      context: {
        id: "provider-1",
        name: "Dr. Test",
        email: "test@test.com",
        role: Option.some("provider"),
        instance_url: Option.some("https://example.com"),
        clinic_id: Option.some("clinic-1"),
        clinic_name: Option.some("Test Clinic"),
        permissions: Option.none(),
      },
    })
  }),
}))

jest.mock("@/store/provider", () => ({
  providerStore: {},
}))

// Navigation hooks
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn((cb) => cb()),
  useScrollToTop: jest.fn(),
}))

// Bottom sheet — inline mock based on upstream mock.js (local copy has JSX that Jest can't parse)
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react")
  const RN = require("react-native")
  const NOOP = () => {}
  const NOOP_VALUE = { value: 0, set: NOOP, get: () => 0 }

  class MockBottomSheetModal extends React.Component {
    state = { visible: false }
    data = null
    snapToIndex() {}
    snapToPosition() {}
    expand() {}
    collapse() {}
    close() { this.data = null; this.setState({ visible: false }) }
    forceClose() { this.data = null; this.setState({ visible: false }) }
    present(data: any) { this.data = data; this.setState({ visible: true }) }
    dismiss() { this.data = null; this.setState({ visible: false }) }
    render() {
      if (!this.state.visible) return null
      const { children: Content } = this.props
      return typeof Content === "function"
        ? React.createElement(Content, { data: this.data })
        : Content
    }
  }

  class MockBottomSheet extends React.Component {
    snapToIndex() {}
    snapToPosition() {}
    expand() {}
    collapse() {}
    close() {}
    forceClose() {}
    render() { return this.props.children }
  }

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetModal: MockBottomSheetModal,
    BottomSheetModalProvider: ({ children }: any) => children,
    BottomSheetView: (props: any) => props.children,
    BottomSheetScrollView: RN.ScrollView,
    BottomSheetSectionList: RN.SectionList,
    BottomSheetFlatList: RN.FlatList,
    BottomSheetTextInput: RN.TextInput,
    BottomSheetBackdrop: NOOP,
    useBottomSheet: () => ({
      snapToIndex: NOOP, snapToPosition: NOOP, expand: NOOP,
      collapse: NOOP, close: NOOP, forceClose: NOOP,
      animatedIndex: NOOP_VALUE, animatedPosition: NOOP_VALUE,
    }),
    useBottomSheetModal: () => ({ dismiss: NOOP, dismissAll: NOOP }),
  }
})

// WatermelonDB withObservables — render the inner component with the props as-is
jest.mock("@nozbe/watermelondb/react", () => ({
  withObservables: () => (component: any) => component,
}))

// Database
jest.mock("@/db", () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => ({
      findAndObserve: jest.fn(),
      query: jest.fn(() => ({
        observe: jest.fn(() => ({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
          pipe: jest.fn(() => ({
            subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
          })),
        })),
      })),
    })),
  },
}))

// Hooks
jest.mock("@/hooks/usePatientRecord", () => ({
  usePatientRecord: jest.fn(() => {
    const { Option } = require("effect")
    return {
      patient: Option.some({
        id: "patient-1",
        givenName: "Jane",
        surname: "Doe",
        dateOfBirth: "1990-01-01",
        sex: "female",
        citizenship: "",
        hometown: "",
        phone: "",
        camp: "",
        photoUrl: "",
        governmentId: "",
        externalPatientId: "",
        additionalData: {},
        metadata: {},
        isDeleted: false,
        deletedAt: Option.none(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      isLoading: false,
    }
  }),
}))

jest.mock("@/hooks/useDBClinicsList", () => ({
  useDBClinicsList: jest.fn(() => ({
    clinics: [{ id: "clinic-1", name: "Test Clinic" }],
    isLoading: false,
  })),
}))

jest.mock("@/hooks/usePermissionGuard", () => ({
  usePermissionGuard: jest.fn(() => ({
    permissions: null,
    isLoading: false,
    can: jest.fn(() => true),
    check: jest.fn(),
    checkOperation: jest.fn(),
    checkEditEvent: jest.fn(),
  })),
}))

// Native modules & misc
jest.mock("react-native-root-toast", () => ({
  show: jest.fn(),
  durations: { SHORT: 2000 },
  positions: { BOTTOM: -40 },
}))

jest.mock("lucide-react-native", () => ({
  LucidePlus: () => "LucidePlus",
  LucideX: () => "LucideX",
}))

jest.mock("usehooks-ts", () => ({
  useDebounceValue: jest.fn((val: string) => [val, jest.fn()]),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockNavigation: any = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  popTo: jest.fn(),
}

const mockRoute: any = {
  key: "PrescriptionEditorForm-test",
  name: "PrescriptionEditorForm",
  params: {
    patientId: "patient-1",
    visitId: "visit-1",
    prescriptionId: undefined,
    shouldCreateNewVisit: false,
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PrescriptionEditorFormScreen", () => {
  it("renders without crashing", () => {
    const { toJSON, getByTestId } = render(
      <PrescriptionEditorFormScreen navigation={mockNavigation} route={mockRoute} />,
    )

    expect(toJSON()).toBeTruthy()
    expect(getByTestId("patient-name")).toBeTruthy()
    expect(getByTestId("patient-age")).toBeTruthy()
    expect(getByTestId("patient-sex")).toBeTruthy()
  })

  it("shows bottom sheet content when pressing add prescription item", async () => {
    const { getByTestId, queryByTestId } = render(
      <PrescriptionEditorFormScreen navigation={mockNavigation} route={mockRoute} />,
    )

    // Bottom sheet content should not be visible initially
    expect(queryByTestId("clinic-inventory-search")).toBeNull()

    fireEvent.press(getByTestId("open-add-prescription-item-form"))

    // After pressing, the bottom sheet should render its content
    await waitFor(() => {
      expect(getByTestId("clinic-inventory-search")).toBeTruthy()
    })
  })
})
