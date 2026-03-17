import { useEffect, useMemo, useState } from "react"

import { database } from "@/db/index"
import RegistrationFormModel from "@/db/model/PatientRegistrationForm"
import Language from "@/models/Language"
import Patient from "@/models/Patient"
import PatientRegistrationForm from "@/models/PatientRegistrationForm"

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
  {
    baseField: true,
    id: "fe4d179e-8153-11f0-8de9-0242ac120002",
    column: "primary_clinic_id",
    position: 12,
    label: {
      en: "Primary Clinic",
      ar: "العيادة الأساسية",
      es: "Clínica Primaria",
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
    isSearchField: false,
    deleted: false,
  },
]

export function getBaseFieldByColumn(
  column: PatientRegistrationForm.BaseColumn | string,
): PatientRegistrationForm.RegistrationFormField | undefined {
  return initialFormFields
    .filter((field) => field.baseField)
    .find((field) => field.column === column)
}

export const initialFormState: PatientRegistrationForm.RegistrationForm = {
  id: "initial-id",
  name: "Patient Registration Form",
  fields: initialFormFields,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
}

// TODO: Remove this type,it has grown to just be the REgistrationFormField
type FormField = {
  id: string
  type: PatientRegistrationForm.InputType
  label: string
  value: any
  visible: boolean
  isSearchField: boolean
  baseField: boolean
  options: Language.TranslationObject[]
  column: PatientRegistrationForm.BaseColumn | string
  required: boolean
}

type PatientRecordEditorState = {
  patientRecord: PatientRegistrationForm.PatientRecord
  formFields: FormField[]
  // Updates the current field's value
  updateField: (id: string, value: any) => void
  // Whether or not the patient record or the form is loading
  isLoading: boolean
}

/**
Hook to manage the state of the PatientRecord.
@param {string} patientId
@param {string} language
@returns {PatientRecordEditorState}
*/
export function usePatientRecordEditor(
  patientId: string | undefined | null,
  language: string,
): PatientRecordEditorState {
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormModel | null>(null)
  const [isLoadingForm, setIsLoadingForm] = useState<boolean>(true)
  const [patientRecord, setPatientRecord] = useState<PatientRegistrationForm.PatientRecord>({
    values: {},
    fields: [],
  })
  const [isLoadingPatient, setIsLoadingPatient] = useState<boolean>(!!patientId)
  // const [formFields, setFormFields] = useState<PatientRecordEditorState["formFields"]>([])

  useEffect(() => {
    let record = Patient.getDefaultPatientRecord(
      registrationForm || ({ fields: [] } as unknown as RegistrationFormModel),
    )
    setIsLoadingPatient(true)

    if (patientId) {
      // get the patient state
      Patient.DB.getById(patientId, registrationForm?.fields || [])
        .then((res) => {
          record = res
          setPatientRecord(record)
        })
        .catch((error) => {
          console.warn("Error fetching a patient with the id: ", patientId, ". [Error]: ", error)
          setPatientRecord(record)
        })
        .finally(() => {
          setIsLoadingPatient(false)
        })
    } else {
      setPatientRecord(record)
      setIsLoadingPatient(false)
    }
  }, [registrationForm, patientId, language])

  useEffect(() => {
    setIsLoadingForm(true)
    const sub = database
      .get<RegistrationFormModel>("registration_forms")
      .query()
      .observe()
      .subscribe((res) => {
        if (res.length === 0) {
          console.info("There are no patient registration forms. This could be an error")
          console.warn("Overriding absent form with default form")
          setRegistrationForm(initialFormState as unknown as RegistrationFormModel)
          setIsLoadingForm(false)
          return
        }
        if (res.length > 1) {
          console.warn(
            "There are more than one registration form. Are you supporting multiple forms?",
          )
        }
        const patientRegistrationForm: RegistrationFormModel | null = res[0]
          ? {
              ...res[0],
              fields: res[0].fields.filter((field) => !field.deleted && field.visible),
            }
          : null
        setRegistrationForm(patientRegistrationForm)
        setIsLoadingForm(false)
      })

    return () => {
      sub.unsubscribe()
      setIsLoadingForm(false)
    }
  }, [])

  const formFields: FormField[] = useMemo(() => {
    return patientRecord.fields
      .map((field) => {
        return {
          id: field.id,
          label: field.label[language] || field.label.en || "",
          type: field.fieldType,
          value: Patient.getPatientFieldById(patientRecord, field.id, ""),
          visible: field.visible && !field.deleted,
          isSearchField: field.isSearchField,
          options: field.options || [],
          baseField: field.baseField,
          column: field.column,
          required: field.required,
        }
      })
      .filter((field) => field.visible)
  }, [registrationForm, patientRecord, patientRecord.values, patientId, patientRecord.fields])
  // get registration form
  // get the default values for each field
  // get the exisiting patient record

  console.log({
    isLoadingForm,
    isLoadingPatient,
  })
  return {
    formFields,
    patientRecord,
    updateField(id, value) {
      if (!id) return
      // NOTE: Should we do type coercion?
      setPatientRecord((pr) => ({
        ...pr,
        values: {
          ...pr.values,
          [id]: value,
        },
      }))
    },
    isLoading: isLoadingPatient || isLoadingForm,
  }
}
