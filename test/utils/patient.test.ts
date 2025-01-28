import {
  getInitials,
  displayName,
  displayNameAvatar,
  getPatientFieldById,
  getAdditionalFieldColumnName,
  getDefaultPatientRecord,
  getPatientFieldByName,
} from "../../app/utils/patient"
import { PatientRecord, PatientValueColumn } from "../../app/types"
import Patient from "../../app/db/model/Patient"
import RegistrationFormModel, {
  RegistrationFormField,
} from "../../app/db/model/PatientRegistrationForm"

describe("Patient Utils", () => {
  describe("getInitials", () => {
    test("should return initials from a full name", () => {
      expect(getInitials("John Doe")).toBe("JD")
    })

    test("should handle multiple words", () => {
      expect(getInitials("John Middle Doe")).toBe("JMD")
    })

    test("should handle empty string", () => {
      expect(getInitials("")).toBe("")
    })

    test("should handle single word", () => {
      expect(getInitials("John")).toBe("J")
    })
  })

  describe("displayName", () => {
    test("should return full name from patient object", () => {
      const patient = { givenName: "John", surname: "Doe" } as Patient
      expect(displayName(patient)).toBe("John Doe")
    })

    test("should handle missing surname", () => {
      const patient = { givenName: "John" } as Patient
      expect(displayName(patient)).toBe("John")
    })

    test("should handle missing given name", () => {
      const patient = { surname: "Doe" } as Patient
      expect(displayName(patient)).toBe("Doe")
    })
  })

  describe("displayNameAvatar", () => {
    test("should return initials from patient object", () => {
      const patient = { givenName: "John", surname: "Doe" } as Patient
      expect(displayNameAvatar(patient)).toBe("JD")
    })

    test("should handle missing surname", () => {
      const patient = { givenName: "John" } as Patient
      expect(displayNameAvatar(patient)).toBe("J")
    })

    test("should handle missing given name", () => {
      const patient = { surname: "Doe" } as Patient
      expect(displayNameAvatar(patient)).toBe("D")
    })
  })

  describe("getPatientFieldById", () => {
    const mockPatientRecord: PatientRecord = {
      fields: [],
      values: {
        field1: "value1",
        field2: 42,
      },
    }

    test("should return value by field id", () => {
      expect(getPatientFieldById(mockPatientRecord, "field1", "")).toBe("value1")
    })

    test("should return fallback for non-existent field", () => {
      expect(getPatientFieldById(mockPatientRecord, "nonexistent", "default")).toBe("default")
    })

    test("should return undefined when no fallback provided", () => {
      expect(getPatientFieldById(mockPatientRecord, "nonexistent")).toBeUndefined()
    })
  })

  describe("getPatientFieldByName", () => {
    const mockPatientRecord: PatientRecord = {
      fields: [
        { id: "field1", column: "name" },
        { id: "field2", column: "age" },
      ],
      values: {
        field1: "John",
        field2: 25,
      },
    }

    test("should return value by field name", () => {
      expect(getPatientFieldByName(mockPatientRecord, "name", "")).toBe("John")
    })

    test("should return fallback for non-existent field name", () => {
      expect(getPatientFieldByName(mockPatientRecord, "nonexistent", "default")).toBe("default")
    })

    test("should return undefined when no fallback provided", () => {
      expect(getPatientFieldByName(mockPatientRecord, "nonexistent")).toBeUndefined()
    })
  })

  describe("getAdditionalFieldColumnName", () => {
    const mockFields: RegistrationFormField[] = [
      { id: "field1", type: "string", column: "string_value" },
      { id: "field2", type: "number", column: "number_value" },
    ]

    test("should return correct column name for existing field", () => {
      expect(getAdditionalFieldColumnName(mockFields, "field1")).toBe("string_value")
    })

    test("should return string_value for non-existent field", () => {
      expect(getAdditionalFieldColumnName(mockFields, "nonexistent")).toBe("string_value")
    })
  })

  describe("getDefaultPatientRecord", () => {
    const mockForm: RegistrationFormModel = {
      fields: [
        { id: "field1", type: "string", column: "string_value" },
        { id: "field2", type: "number", column: "number_value" },
      ],
    }

    test("should create default patient record with empty values", () => {
      const result = getDefaultPatientRecord(mockForm)
      expect(result).toEqual({
        fields: mockForm.fields,
        values: {},
      })
    })
  })
})
