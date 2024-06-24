import database from "app/db"
import RegistrationFormModel, { RegistrationFormField } from "app/db/model/PatientRegistrationForm"
import { patientApi } from "app/services/api/patientApi"
import { PatientRecord, TranslationObject } from "app/types"
import { getDefaultPatientRecord, getPatientFieldById } from "app/utils/patient"
import { useEffect, useMemo, useState } from "react"
import { initialFormState } from "./usePatientRegistrationForm"

// TODO: Remove this type,it has grown to just be the REgistrationFormField
type FormField = {
  id: string
  type: RegistrationFormField["fieldType"]
  label: string
  value: any
  visible: boolean
  isSearchField: boolean
  baseField: boolean
  options: TranslationObject[]
  column: RegistrationFormField["column"]
}

type PatientRecordEditorState = {
  patientRecord: PatientRecord
  formFields: FormField[]
  // Updates the current field's value
  updateField: (id: string, value: any) => void
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
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormModel | null>(null)
  const [patientRecord, setPatientRecord] = useState<PatientRecord>({ values: {}, fields: [] })
  // const [formFields, setFormFields] = useState<PatientRecordEditorState["formFields"]>([])

  useEffect(() => {
    let record = getDefaultPatientRecord(
      registrationForm || ({ fields: [] } as unknown as RegistrationFormModel),
    )

    if (patientId) {
      // get the patient state
      patientApi
        .getById(patientId, registrationForm?.fields || [])
        .then((res) => {
          record = res
          setPatientRecord(record)
        })
        .catch((error) => {
          console.warn("Error fetching a patient with the id: ", patientId)
          setPatientRecord(record)
        })
    } else {
      setPatientRecord(record)
    }
  }, [registrationForm, patientId, language])

  useEffect(() => {
    setIsLoading(true)
    const sub = database
      .get<RegistrationFormModel>("registration_forms")
      .query()
      .observe()
      .subscribe((res) => {
        if (res.length === 0) {
          console.error("There are no patient registration forms. This could be an error")
          console.warn("Overriding absent form with default form")
          return setRegistrationForm(initialFormState as unknown as RegistrationFormModel)
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
      })

    return () => {
      sub.unsubscribe()
    }
  }, [])

  const formFields: FormField[] = useMemo(() => {
    return patientRecord.fields
      .map((field) => {
        return {
          id: field.id,
          label: field.label[language] || field.label.en || "",
          type: field.fieldType,
          value: getPatientFieldById(patientRecord, field.id, ""),
          visible: field.visible && !field.deleted,
          isSearchField: field.isSearchField,
          options: field.options || [],
          baseField: field.baseField,
          column: field.column,
        }
      })
      .filter((field) => field.visible)
  }, [registrationForm, patientRecord, patientRecord.values, patientId, patientRecord.fields])
  // get registration form
  // get the default values for each field
  // get the exisiting patient record

  // console.log({ formFields, fields: patientRecord })

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
  }
}
