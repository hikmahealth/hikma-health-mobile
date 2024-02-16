import { isValid, parse, parseISO } from "date-fns";
import { camelCase } from "lodash";
import { useEffect, useState } from "react";
import database from "../db";
import PatientModel from "../db/model/Patient";
import RegistrationFormModel from "../db/model/PatientRegistrationForm";
import { Patient } from "../types";


const inputTypes = ["number", "text", "select", "date"] as const

type DefaultLanguages = {
  en: string;
  ar?: string;
  es?: string;
}

export type TranslationObject = DefaultLanguages & {
  [lang: string]: string
}

export type LanguageKey = "en" | "ar" | "es" | string;

export type BaseColumn = "given_name" | "surname" | "date_of_birth" | "sex" | "country";
const baseColumns: BaseColumn[] = ["given_name", "surname", "date_of_birth", "sex", "country"]

type RegistrationFormField = {
  id: string,
  position: number;
  // column name in the database
  column: BaseColumn;
  label: TranslationObject,
  fieldType: typeof inputTypes[number],
  options: TranslationObject[]
  required: boolean;
  baseField: boolean; // whether or not this is part of the base inputs required of all registration forms
  visible: boolean; // Whether or not it displays in the app
}


type RegistrationForm = {
  id: string,
  name: string,
  fields: RegistrationFormField[],
  metadata: Record<string, any>,
  createdAt: Date;
  updatedAt: Date;
}

/**
Derived from the Patient Model

*/
type BaseFields = {
  id: string,
  firstName: string,
  lastName: string,
  sex: string,
  dateOfBirth: Date;
  registrationDate: Date
}

// sometimes typescript is so confusing
// FormState holds an object where the keys are the field, and the values are the form entries by the users
type FormState = BaseFields & Record<keyof PatientModel, any> & Record<BaseColumn, any> & {
  [key: string]: any
}


type RegistrationFormAPI = {
  formState: {},
  setValue: (field: string, value: any) => void;
  submit: () => void;
}


/**
Registration form hook that syncs form data from db, and sets up state for a given patient record

@param {string} language
@param {Patient} patientData
*/
export function useRegistrationForm(language: string, patientData?: PatientModel) {
  const [form, setForm] = useState<RegistrationForm>(initialFormState)
  const [state, setState] = useState<FormState>(stateFromFields(initialFormState.fields))

  useEffect(() => {
    database.get<RegistrationFormModel>("registration_forms").query().fetch().then(res => {
      if (res.length === 0) {
        throw Error("There are no local forms. Make sure the admin has created a registration form and it has been synced.")
      }
      const data = res[0]
      setForm(data as RegistrationForm)
      const formState = stateFromFields(data.fields);
      setState(setPatientDataToState(formState, patientData))
    }).catch(error => {
      console.warn(error);
      setForm(initialFormState)
      setState(stateFromFields(initialFormState.fields))
    })
  }, [])


  return {
    form,
    state,
    /** field is the column name */
    setField: (field: string, value: any) => setState(s => ({ ...s, [field]: value }))
  }

}


/**
Given a set of fields (the fields from the state), and existing patient data,
format the state to incorporate the patient data.

This can be seen as merging of the state and patient data, giving priority to state data

See `stateFromFields` method for some context

@param {FormState} state
@param {PatientModel | undefined} patient
@returns {FormState} formState
*/
function setPatientDataToState(state: FormState, patient?: PatientModel): FormState {
  if (!patient) {
    return state;
  }
  let _state = state;

  // base fields are known ahead of time, and their db counterpart is just the camelCase version of it
  baseColumns.forEach(colName => {
    const patientAttribute = camelCase(colName)
    console.log(patientAttribute, patient[patientAttribute])
    if (colName in state && patientAttribute in patient) {
      // TODO: add ts-expect-error
      _state[colName] = patient[patientAttribute] || state[colName]
    }
  })

  // Manually set the date of birth as being a date
  _state.date_of_birth = parse(state.date_of_birth, "yyyy-MM-dd", new Date())


  // ignoring the base fields from the state, set the rest of the fields to the state from the patients additional data
  // this data does not have to be camelCase, its user generated and could be anything. we need to url decode
  const additionalFields = Object.keys(state).filter(x => !baseColumns.includes(x as any))
  additionalFields.forEach(fieldName => {
    const value = patient.additionalData?.[fieldName];
    // account for dates
    _state[fieldName] = isValid(parseISO(value)) ? parseISO(value) : value
  })

  // console.log("HERE: ",,  _state.created_at = patient.createdAt;
  _state.updated_at = patient.updatedAt;

  // console.log({ _state })


  return _state
}


/**
Given a set of fields, return the empty state ready for updating

@param {RegistrationFormField[]} fields
@returns {Record<string, any>}
*/
function stateFromFields(fields: RegistrationFormField[]): FormState {
  const res: FormState = {} as FormState
  fields.forEach(field => {
    switch (field.fieldType) {
      case "number":
        res[field.column] = 0
        break;
      case "date":
        res[field.column] = new Date()
        break;
      case "text":
      case "select":
      default:
        res[field.column] = ""
        break;

    }
  })
  return res
}



const initialFormFields: RegistrationFormField[] = [

  {
    baseField: true,
    id: "e3d7615c-6ee6-11ee-b962-0242ac120002",
    column: "given_name",
    position: 1,
    label: {
      en: "First Name",
      es: "Nombre",
      ar: "الاسم المعطى"
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
  },
  {
    baseField: true,
    id: "128faebe-6ee7-11ee-b962-0242ac120002",
    column: "surname",
    position: 2,
    label: {
      en: "Last Name",
      ar: "الكنية",
      es: "Apellido"
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
  },
  {
    baseField: true,
    id: "417d5df8-6eeb-11ee-b962-0242ac120002",
    column: "date_of_birth",
    position: 3,
    label: {
      en: "Date of Birth",
      ar: "تاريخ الولادة",
      es: "Fecha de nacimiento"
    },
    fieldType: "date",
    options: [],
    visible: true,
    required: true,
  },
  {
    baseField: true,
    id: "4b9190de-6eeb-11ee-b962-0242ac120002",
    column: "sex",
    position: 4,
    label: {
      en: "Sex",
      ar: "جنس",
      es: "Sexo"
    },
    fieldType: "select",
    options: [
      {
        en: "male",
        ar: "ذكر",
        es: "masculino"
      },
      {
        en: "female",
        ar: "أنثى",
        es: "femenino"
      }
    ], // only if its a search field
    visible: true,
    required: true,
  },
  {
    baseField: true,
    id: "33282fe0-6f76-11ee-b962-0242ac120002",
    column: "country",
    position: 6,
    label: {
      en: "Country",
      ar: "بلد",
      es: "País"
    },
    fieldType: "text",
    options: [],
    visible: true,
    required: true,
  },

]

const initialFormState: RegistrationForm = {
  id: "initial-id",
  name: "Patient Registration Form",
  fields: initialFormFields,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date()
}
