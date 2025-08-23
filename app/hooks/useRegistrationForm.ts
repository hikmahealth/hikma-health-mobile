import { useEffect, useState } from "react"
import { format, isValid, parse, parseISO } from "date-fns"
import { camelCase, omit, set } from "es-toolkit/compat"

import { database } from "@/db/index"
import RegistrationFormModel from "@/db/model/PatientRegistrationForm"
import Language from "@/models/Language"
import PatientRegistrationForm from "@/models/PatientRegistrationForm"

import PatientModel, { PatientModelData } from "../db/model/Patient"

/**
Registration form hook that syncs form data from db, and sets up state for a given patient record

@param {string} language
@param {Patient} patientData
*/
export function useRegistrationForm(language: string, patientData?: PatientModel) {
  const [form, setForm] = useState<PatientRegistrationForm.RegistrationForm>(initialFormState)
  const [state, setState] = useState<PatientRegistrationForm.FormState>(
    stateFromFields(initialFormState.fields),
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // set the state with the initial values from either the patientData or the initial values

  useEffect(() => {
    setIsLoading(true)
    database
      .get<RegistrationFormModel>("registration_forms")
      .query()
      .fetch()
      .then((res) => {
        if (res.length === 0) {
          throw Error(
            "There are no local forms. Make sure the admin has created a registration form and it has been synced.",
          )
        }
        const data = res[0]
        setForm(data as PatientRegistrationForm.RegistrationForm)
        const formState = stateFromFields(data.fields)
        if (patientData) {
          setState(setPatientDataToState(formState, patientData))
        } else {
          setState(formState)
        }
      })
      .catch((error) => {
        setForm(initialFormState)
        const formState = stateFromFields(initialFormState.fields)
        if (patientData) {
          setState(setPatientDataToState(formState, patientData))
        } else {
          setState(formState)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [patientData])

  /**
   * For the current patient state, format and return the patient record of type PatientModelData
   * This is used to save the patient record to the database
   */
  function getPatientRecord(): PatientModelData {
    return {
      givenName: state.given_name,
      surname: state.surname,
      camp: state.camp || "",
      dateOfBirth: format(state.date_of_birth, "yyyy-MM-dd"),
      sex: state.sex || "",
      citizenship: state.citizenship || "",
      hometown: state.hometown || "",
      phone: state.phone || "",
      photoUrl: state.photo_url || "",
      governmentId: state.government_id || "",
      externalPatientId: state.external_patient_id || "",

      /** additionalData is the dynamic data that is stored in the database, not including the base fields that have their own columns */
      additionalData: omit(state, PatientRegistrationForm.baseColumns),
      metadata: state.metadata,
    } as PatientModelData
  }

  return {
    form,
    state,
    /** field is the column name */
    setField: (field: string, value: any) => setState((s) => ({ ...s, [field]: value })),
    getPatientRecord,
    isLoading,
  }
}

/**
  * Given a set of fields (the fields from the state), and existing patient data,
  * format the state to incorporate the patient data.

  * This can be seen as merging of the state and patient data, giving priority to state data

  * See `stateFromFields` method for some context

  * @param {PatientRegistrationForm.FormState} state
  * @param {PatientModel | undefined} patient
  * @returns {PatientRegistrationForm.FormState} formState
*/
function setPatientDataToState(
  state: PatientRegistrationForm.FormState,
  patient?: PatientModel,
): PatientRegistrationForm.FormState {
  if (!patient) {
    return state
  }
  const _state = state

  // base fields are known ahead of time, and their db counterpart is just the camelCase version of it
  PatientRegistrationForm.baseColumns.forEach((colName) => {
    const patientAttribute = camelCase(colName)
    if (colName in state && patientAttribute in patient) {
      // TODO: add ts-expect-error
      _state[colName] = patient[patientAttribute] || state[colName]
    }
  })

  // Manually set the date of birth as being a date
  _state.date_of_birth = parse(state.date_of_birth, "yyyy-MM-dd", new Date())

  // ignoring the base fields from the state, set the rest of the fields to the state from the patients additional data
  // this data does not have to be camelCase, its user generated and could be anything. we need to url decode
  const additionalFields = Object.keys(state).filter(
    (x) => !PatientRegistrationForm.baseColumns.includes(x as any),
  )
  additionalFields.forEach((fieldName) => {
    const value = patient.additionalData?.[fieldName]
    // account for dates
    _state[fieldName] = isValid(parseISO(value)) ? parseISO(value) : value
  })

  _state.updated_at = patient.updatedAt

  return _state
}

/**
  * Given a set of fields, return the empty state ready for updating
  * This is used to set the initial state of the form

  * This function is defined to return default values even though we don't what the full form looks ahead of time

  * @param {PatientRegistrationForm.RegistrationFormField[]} fields
  * @returns {Record<string, any>}
*/
function stateFromFields(
  fields: PatientRegistrationForm.RegistrationFormField[],
): PatientRegistrationForm.FormState {
  return fields.reduce((res, field) => {
    switch (field.fieldType) {
      case "number":
        return { ...res, [field.column]: 0 }
      case "date":
        return { ...res, [field.column]: new Date() }
      case "boolean":
        return { ...res, [field.column]: false }
      case "text":
      case "select":
      default:
        return { ...res, [field.column]: "" }
    }
  }, {} as PatientRegistrationForm.FormState)
}

// NOTE: DO NOT use
// FIXME: Remove all this, use patient record editor. Tombstone Aug 12
/**
 * As per the spec of mandatory fields, we need to have a set of fields that are required for all registration forms
 * This is the initial state of the form, and is used as a fallback if the form cannot be fetched from the db
 */
const initialFormFields: PatientRegistrationForm.RegistrationFormField[] = [
  {
    baseField: true,
    id: "e3d7615c-6ee6-11ee-b962-0242ac120002",
    column: "given_name",
    position: 1,
    label: {
      en: "First Name",
      es: "Nombre",
      ar: "الاسم المعطى",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
  {
    baseField: true,
    id: "128faebe-6ee7-11ee-b962-0242ac120002",
    column: "surname",
    position: 2,
    label: {
      en: "Last Name",
      ar: "الكنية",
      es: "Apellido",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
  {
    baseField: true,
    id: "417d5df8-6eeb-11ee-b962-0242ac120002",
    column: "date_of_birth",
    position: 3,
    label: {
      en: "Date of Birth",
      ar: "تاريخ الولادة",
      es: "Fecha de nacimiento",
    },
    fieldType: "date",
    options: [],
    visible: true,
    required: true,
    isSearchField: true,
    deleted: false,
  },
  {
    baseField: true,
    id: "4b9190de-6eeb-11ee-b962-0242ac120002",
    column: "sex",
    position: 4,
    label: {
      en: "Sex",
      ar: "جنس",
      es: "Sexo",
    },
    fieldType: "select",
    options: [
      {
        en: "male",
        ar: "ذكر",
        es: "masculino",
      },
      {
        en: "female",
        ar: "أنثى",
        es: "femenino",
      },
    ], // only if its a search field
    visible: true,
    required: true,
    isSearchField: true,
    deleted: false,
  },
  {
    baseField: true,
    id: "33282fe0-6f76-11ee-b962-0242ac120002",
    column: "citizenship",
    position: 6,
    label: {
      en: "Citizenship",
      ar: "المواطنة",
      es: "Ciudadanía",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
  {
    baseField: true,
    id: "f6024866-bc83-11ee-a506-0242ac120002",
    column: "camp",
    position: 8,
    label: {
      en: "Camp",
      ar: "مخيم",
      es: "Campamento",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
  {
    baseField: true,
    id: "be6e53d6-120a-11ef-9262-0242ac120002",
    column: "government_id",
    position: 9,
    label: {
      en: "Government ID",
      ar: "الهوية الحكومية",
      es: "Identificación del gobierno",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
  {
    baseField: true,
    id: "b7671870-120a-11ef-9262-0242ac120002",
    column: "external_patient_id",
    position: 10,
    label: {
      en: "Patient ID",
      ar: "رقم المريض",
      es: "ID del paciente",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
  {
    baseField: true,
    id: "fd328808-bc83-11ee-a506-0242ac120002",
    column: "phone",
    position: 11,
    label: {
      en: "Phone",
      ar: "هاتف",
      es: "Teléfono",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
]

export const initialFormState: PatientRegistrationForm.RegistrationForm = {
  id: "initial-id",
  name: "Patient Registration Form",
  fields: initialFormFields,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}
