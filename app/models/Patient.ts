import { Q } from "@nozbe/watermelondb"
import * as Sentry from "@sentry/react-native"
import { format, isValid } from "date-fns"
import { Either, Option } from "effect"
import { camelCase } from "es-toolkit/compat"

import database from "@/db"
import AppointmentModel from "@/db/model/Appointment"
import EventModel from "@/db/model/Event"
import PatientModel from "@/db/model/Patient"
import PatientAdditionalAttribute from "@/db/model/PatientAdditionalAttribute"
import { RegistrationFormField } from "@/db/model/PatientRegistrationForm"
import VisitModel from "@/db/model/Visit"
import { providerStore } from "@/store/provider"

import Event from "./Event"
import PatientRegistrationForm from "./PatientRegistrationForm"
import UserClinicPermissions from "./UserClinicPermissions"
import Visit from "./Visit"

namespace Patient {
  export type T = {
    id: string
    givenName: string
    surname: string
    dateOfBirth: string
    citizenship: string
    hometown: string
    phone: string
    sex: string
    camp: string
    photoUrl: string
    governmentId: string
    externalPatientId: string
    additionalData: Record<string, any>
    metadata: Record<string, any>
    isDeleted: boolean
    deletedAt: Option.Option<Date>
    createdAt: Date
    updatedAt: Date

    // V5
    primaryClinicId?: string
    lastModifiedBy?: string
    // !v5
  }

  export type PatientValueColumn = "date_value" | "string_value" | "boolean_value" | "number_value"

  export type DBPatient = PatientModel
  export type DBPatientAttributes = PatientAdditionalAttribute

  export namespace AdditionalAttributes {
    export type T = {
      // TODO:
    }
  }

  /**
   * Display the patient name that would show in the avatar (usually in the case of no image)
   * @param {Patient} patient
   * @returns {string}
   */
  export const displayNameAvatar = (patient: Patient.T): string => {
    const { givenName = " ", surname = " " } = patient
    return getInitials(`${givenName} ${surname}`)
  }

  /**
   * Given a patients name, return the initials
   * @param {string} name
   * @param {number} maxLen
   * @returns {string}
   */
  export const getInitials = (name: string, maxLen = 3): string => {
    // split at the spaces and take the first letter of each word in the name, make it uppercase
    return name
      ?.split(" ")
      .map((word) => word?.[0]?.toUpperCase())
      .join("")
      .trim()
      .slice(0, maxLen)
  }

  /**
   * Display the patient name that would show in the patient list
   * @param {Patient} patient
   * @returns {string}
   */
  export const displayName = (patient: { givenName: string; surname: string }): string => {
    const { givenName = " ", surname = " " } = patient
    return `${givenName} ${surname}`.trim()
  }

  /**
  Given a PatientRegistrationForm.FormState, return the value of the field, or the default value
  @param {PatientRegistrationForm.PatientRecord} patientRecord
  @param {string} fieldName
  @param {T} fallback
  */
  export function getPatientFieldByName<T>(
    patientRecord: PatientRegistrationForm.PatientRecord,
    fieldName: string,
    fallback?: T,
  ): T | undefined {
    const { fields, values } = patientRecord
    // get the id of the field from the form
    const field = fields.find((field) => field.column === fieldName)
    if (!field) {
      return fallback || undefined
    }

    // get the value from the data field by the id
    return (values[field.id] as T) || fallback || undefined
  }

  /**
  Given a PatientRecord, return the value of the field by its ID, or the default value
  @param {PatientRegistrationForm.PatientRecord} patientRecord
  @param {string} fieldId
  @param {T} fallback
  */
  export function getPatientFieldById<T>(
    patientRecord: PatientRegistrationForm.PatientRecord,
    fieldId: string,
    fallback?: T,
  ): T | undefined {
    const { values } = patientRecord
    if (!fieldId) {
      return fallback ?? undefined
    }

    // get the value from the data field by the id
    return (values[fieldId] as T) ?? fallback ?? undefined
  }

  /**
  Given a the fields of a patient form, and the attributeID, return the
  column name of that field.

  Returns the default of "string_value" column name, including if there are any errors.
  @param {RegistrationFormField[]} fields
  @param {string} attributeId
  @returns {PatientValueColumn}
  */
  export function getAdditionalFieldColumnName(
    fields: RegistrationFormField[],
    attributeId: string,
  ): PatientValueColumn {
    const attr = fields.find((f) => f.id === attributeId)

    if (!attr) {
      console.warn(
        "Attribute column name not found. Returning 'string_value' default. AttributeId: ",
        fields,
        attributeId,
      )
      return "string_value"
    }

    if (attr.fieldType === "number") {
      return "number_value"
    } else if (attr.fieldType === "select" || attr.fieldType === "text") {
      return "string_value"
    } else if (attr.fieldType === "date") {
      return "date_value"
    } else if (attr.fieldType === "boolean") {
      return "boolean_value"
    }

    // if all else fails, somehow
    return "string_value"
  }

  /**
  Create the default patient record object given a patient registration form
  @param {RegistrationFormModel} registrationForm
  @returns {PatientRecord}
  */
  export function getDefaultPatientRecord(
    registrationForm: PatientRegistrationForm.PatientRecord,
  ): PatientRegistrationForm.PatientRecord {
    const values = registrationForm["fields"].reduce(
      (prev, field) => {
        const key = field.id
        if (["text", "select"].includes(field.fieldType)) {
          prev[key] = ""
        } else if (field.fieldType === "number") {
          prev[key] = 0
        } else if (field.fieldType === "date") {
          prev[key] = new Date()
        } else if (field.fieldType === "boolean") {
          prev[key] = false
        }
        return prev
      },
      {} as PatientRegistrationForm.PatientRecord["values"],
    )
    return {
      fields: registrationForm["fields"],
      values,
    }
  }

  export namespace DB {
    export type T = PatientModel
    export const table_name = "patients"

    /**
     * Subscription to a patient record in the database
     * @param patientId The patient ID
     * @param {(patient: Option.Option<DB.T>, isLoading: boolean) => void} callback Function called when patient data updates
     * @returns {{unsubscribe: () => void}} Object containing unsubscribe function
     */
    export async function subscribe(
      patientId: string,
      provider: {
        userId: string
        clinicId: string
      },
      callback: (patient: Option.Option<DB.T>, isLoading: boolean) => void,
    ): Promise<{ unsubscribe: () => void }> {
      const { userId, clinicId } = provider

      if (!clinicId) {
        throw new Error("Provider does not belong to any clinic")
      }

      const viewHistoryClinicIds = await UserClinicPermissions.DB.getClinicIdsWithPermission(
        userId,
        "canViewHistory",
      )
      let isLoading = true

      const subscription = database.collections
        .get<DB.T>("patients")
        .findAndObserve(patientId)
        .subscribe((dbPatient) => {
          const patient = dbPatient
          // If the patient has no primary clinic, then just return the patient.
          if (!patient.primaryClinicId || viewHistoryClinicIds.includes(patient.primaryClinicId)) {
            callback(Option.fromNullable(patient), isLoading)
          } else {
            callback(Option.none(), isLoading)
          }
          isLoading = false
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }

    /**
     * Fetch patient report data used in the generation of a downloadable report pdf
     * @param {string} patientId
     * @param {boolean} ignoreEmptyVisits
     * @returns {Promise<{ visit: Visit.DB.T, events: Event.DB.T[] }[]>}
     */
    export async function getReportData(
      patientId: string,
      ignoreEmptyVisits: boolean,
    ): Promise<{ visit: Visit.DB.T; events: Event.DB.T[] }[]> {
      const visits = await database
        .get<Visit.DB.T>("visits")
        .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
        .fetch()

      const events = await database
        .get<Event.DB.T>("events")
        .query(Q.and(Q.where("patient_id", patientId), Q.where("is_deleted", false)))
        .fetch()

      const results = visits.map((visit) => {
        return {
          visit,
          events: events.filter((ev) => ev.visitId === visit.id),
        }
      })
      if (ignoreEmptyVisits) {
        return results.filter((res) => res.events.length > 0)
      }
      return results
    }

    /**
     * Converts from PatientModel (aka DBPatient) to Patient.T
     * @param dbPatient The PatientModel to convert
     * @returns The converted Patient.T
     */
    export const fromDB = (dbPatient: DB.T): Patient.T => ({
      id: dbPatient.id,
      givenName: dbPatient.givenName,
      surname: dbPatient.surname,
      dateOfBirth: dbPatient.dateOfBirth,
      citizenship: dbPatient.citizenship,
      hometown: dbPatient.hometown,
      phone: dbPatient.phone,
      sex: dbPatient.sex,
      camp: dbPatient.camp,
      photoUrl: dbPatient.photoUrl,
      governmentId: dbPatient.governmentId,
      externalPatientId: dbPatient.externalPatientId,
      additionalData: dbPatient.additionalData,
      metadata: dbPatient.metadata,
      isDeleted: dbPatient.isDeleted,
      deletedAt: Option.fromNullable(dbPatient.deletedAt),
      createdAt: dbPatient.createdAt,
      updatedAt: dbPatient.updatedAt,
      primaryClinicId: dbPatient.primaryClinicId,
      lastModifiedBy: dbPatient.lastModifiedBy,
    })

    /** Default empty Patient Item */
    export const empty: Patient.T = {
      id: Math.random().toString(),
      givenName: "John",
      surname: "Doe",
      dateOfBirth: "1990-01-01",
      citizenship: "",
      hometown: "",
      phone: "",
      sex: "male",
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
      primaryClinicId: "",
      lastModifiedBy: "",
    }

    /**
    Register a new patient
    @param {PatientRegistrationForm.PatientRecord} patientRecord
    @param {{ id: string; name: string }} provider - The provider information
    @param {{ id: string; name: string }} clinic - The clinic information
    @returns {Promise<PatientModel["id"]>}
    */
    export const register = async (
      patientRecord: PatientRegistrationForm.PatientRecord,
      provider: { id: string; name: string },
      clinic: { id: string; name: string },
    ): Promise<PatientModel["id"]> => {
      // Check permission before registering
      const primaryClinicId =
        getPatientFieldByName(patientRecord, "primary_clinic_id", "") || clinic.id
      const permission = "canRegisterPatients"
      const permissionClinicIds = await UserClinicPermissions.DB.getClinicIdsWithPermission(
        provider.id,
        permission,
      )
      const hasPermission = permissionClinicIds?.includes(primaryClinicId)
      if (!hasPermission) {
        throw new Error("Permission denied")
      }

      const { fields, values } = patientRecord

      // prepare the patient record
      const ptQuery = database.get<PatientModel>("patients").prepareCreate((newPatient) => {
        newPatient.givenName = getPatientFieldByName(patientRecord, "given_name", "") || ""
        newPatient.surname = getPatientFieldByName(patientRecord, "surname", "") || ""
        newPatient.sex = getPatientFieldByName(patientRecord, "sex", "") || ""
        newPatient.phone = getPatientFieldByName(patientRecord, "phone", "") || ""
        newPatient.citizenship = getPatientFieldByName(patientRecord, "citizenship", "") || ""
        newPatient.photoUrl = getPatientFieldByName(patientRecord, "photo_url", "") || ""
        newPatient.camp = getPatientFieldByName(patientRecord, "camp", "") || ""
        newPatient.hometown = getPatientFieldByName(patientRecord, "hometown", "") || ""
        newPatient.dateOfBirth = format(
          getPatientFieldByName(patientRecord, "date_of_birth", new Date()) || new Date(),
          "yyyy-MM-dd",
        )
        newPatient.additionalData = getPatientFieldByName(
          patientRecord,
          "additional_data",
          {},
        ) as Record<any, any>
        newPatient.governmentId = getPatientFieldByName(patientRecord, "government_id", "") || ""
        newPatient.externalPatientId =
          getPatientFieldByName(patientRecord, "external_patient_id", "") || ""
        newPatient.primaryClinicId = primaryClinicId || ""
        newPatient.lastModifiedBy = provider.id
      })

      const patientAttributesRef = database.get<PatientAdditionalAttribute>(
        "patient_additional_attributes",
      )
      const attrQueries = fields
        .filter((field) => !field.baseField)
        .map((field) => {
          return patientAttributesRef.prepareCreate((newAttr) => {
            newAttr.patientId = ptQuery.id
            newAttr.attributeId = field.id
            newAttr.attribute = field.column

            newAttr.metadata = {}

            if (field.fieldType === "number") {
              newAttr.numberValue = values[field.id] as number
            } else if (field.fieldType === "date") {
              newAttr.dateValue = values[field.id] as number
            } else if (field.fieldType === "boolean") {
              newAttr.booleanValue = values[field.id] as boolean
            } else {
              newAttr.stringValue = String(values[field.id] || "")
            }
          })
        })

      // commit the db changes
      await database.write(async () => {
        return database.batch([ptQuery, ...attrQueries])
      })

      return ptQuery.id
    }

    /**
    Check if a patient with this government id exists
    @param {string} governmentId
    @returns {boolean} whether or not the patient exists
    */
    export const checkGovtIdExists = async (governmentId: string): Promise<boolean> => {
      try {
        const patients = await database
          .get<PatientModel>("patients")
          .query(Q.where("government_id", governmentId))
          .fetch()

        if (patients.length > 0) {
          return true
        } else {
          return false
        }
      } catch (error) {
        console.error(error)
        return false
      }
    }

    /**
    Get patient by government_id
    @param {string} governmentId
    @param {RegistrationFormField[]} fields
    @returns {Promise<PatientRegistrationForm.PatientRecord>}
    */
    export const getByGovernmentId = async (
      governmentId: string,
      formFields: RegistrationFormField[],
    ): Promise<PatientRegistrationForm.PatientRecord> => {
      const patientRecord: PatientRegistrationForm.PatientRecord = {
        fields: formFields,
        values: {},
      }

      if (!governmentId || governmentId.length <= 3) {
        return Promise.reject("Unable to find patient with government_id: " + governmentId)
      }

      try {
        const patients = await database
          .get<PatientModel>("patients")
          .query(Q.where("government_id", governmentId))
          .fetch()

        if (patients.length === 0) {
          return Promise.reject("Unable to find patient with government_id: " + governmentId)
        }

        const patient = patients[0]
        if (patients.length > 1) {
          console.error("Multiple patients with the same government id have been recorded")
        }

        formFields
          .filter((field) => field.baseField)
          .map((bField) => {
            // patient column names are in came case while the db columns are in
            // snake_case. This is an artifact of using watermelondb.
            const columnName = camelCase(bField.column)
            const value = patient[columnName] as string | number | Date
            patientRecord["values"][bField.id] = value
          })

        const additionalFields = await database
          .get<PatientAdditionalAttribute>("patient_additional_attributes")
          .query(Q.where("government_id", governmentId), Q.sortBy("updated_at", "asc"))
          .fetch()

        // TODO: abstract out
        const values = additionalFields.reduce(
          (prev, field) => {
            const key = field.attributeId
            if (key in prev) {
              console.warn(
                "Additional patient field duplicate detected. Overwiting with newer record",
              )
            }
            const additionalFieldName = getAdditionalFieldColumnName(formFields, key)
            if (additionalFieldName === "string_value") {
              prev[key] = field.stringValue
            } else if (additionalFieldName === "date_value") {
              prev[key] = field.dateValue
            } else if (additionalFieldName === "number_value") {
              prev[key] = field.numberValue
            } else if (additionalFieldName === "boolean_value") {
              prev[key] = field.booleanValue
            }
            return prev
          },
          {} as PatientRegistrationForm.PatientRecord["values"],
        )

        patientRecord.values = {
          ...patientRecord.values,
          ...values,
        }
        return patientRecord
      } catch (error) {
        console.error("Error getting the patient by govoernment id: ", error)
        return Promise.reject(error)
      }
    }

    /**
    Get patient by id
    @param {string} id
    @param {RegistrationFormField[]} fields
    @returns {Promise<PatientRegistrationForm.PatientRecord>}
    */
    export const getById = async (
      id: string,
      formFields: RegistrationFormField[],
    ): Promise<PatientRegistrationForm.PatientRecord> => {
      const patientRecord: PatientRegistrationForm.PatientRecord = {
        fields: formFields,
        values: {},
      }

      try {
        const patient = await database.get<PatientModel>("patients").find(id)

        formFields
          .filter((field) => field.baseField)
          .map((bField) => {
            // patient column names are in came case while the db columns are in
            // snake_case. This is an artifact of using watermelondb.
            const columnName = camelCase(bField.column)
            const value = patient[columnName] as string | number | Date
            patientRecord["values"][bField.id] = value
          })

        const additionalFields = await database
          .get<PatientAdditionalAttribute>("patient_additional_attributes")
          .query(Q.where("patient_id", id), Q.sortBy("updated_at", "asc"))
          .fetch()

        // TODO: abstract out
        const values = additionalFields.reduce(
          (prev, field) => {
            const key = field.attributeId
            if (key in prev) {
              console.warn(
                "Additional patient field duplicate detected. Overwiting with newer record",
              )
            }
            const additionalFieldName = getAdditionalFieldColumnName(formFields, key)
            if (additionalFieldName === "string_value") {
              prev[key] = field.stringValue
            } else if (additionalFieldName === "date_value") {
              prev[key] = field.dateValue
            } else if (additionalFieldName === "number_value") {
              prev[key] = field.numberValue
            } else if (additionalFieldName === "boolean_value") {
              prev[key] = field.booleanValue
            }
            return prev
          },
          {} as PatientRegistrationForm.PatientRecord["values"],
        )

        patientRecord.values = {
          ...patientRecord.values,
          ...values,
        }
      } catch (error) {
        console.error("Error getting the patient by id: ", error)
      } finally {
        return patientRecord
      }
    }

    /**
    Update a patient by id
    @param patientId {string}
    @param patientRecord {PatientRegistrationForm.PatientRecord}
    */
    export const updateById = async (
      patientId: string,
      patientRecord: PatientRegistrationForm.PatientRecord,
      provider: { id: string; name: string },
      clinic: { id: string; name: string },
    ) => {
      const { fields, values } = patientRecord
      const primaryClinicId =
        getPatientFieldByName(patientRecord, "primary_clinic_id", "") || clinic.id
      const viewHistoryClinicIds = await UserClinicPermissions.DB.getClinicIdsWithPermission(
        provider.id,
        "canEditRecords",
      )

      if (!viewHistoryClinicIds.includes(primaryClinicId)) {
        throw new Error("Unauthorized")
      }

      // prepare the patient record

      const patient = await database.get<PatientModel>("patients").find(patientId)
      const patientDateOfBirth = getPatientFieldByName(patientRecord, "date_of_birth", "") || ""
      const ptQuery = patient.prepareUpdate((updPatient) => {
        updPatient.givenName = getPatientFieldByName(patientRecord, "given_name", "") || ""
        updPatient.surname = getPatientFieldByName(patientRecord, "surname", "") || ""
        updPatient.sex = getPatientFieldByName(patientRecord, "sex", "") || ""
        updPatient.phone = getPatientFieldByName(patientRecord, "phone", "") || ""
        updPatient.citizenship = getPatientFieldByName(patientRecord, "citizenship", "") || ""
        updPatient.photoUrl = getPatientFieldByName(patientRecord, "photo_url", "") || ""
        updPatient.camp = getPatientFieldByName(patientRecord, "camp", "") || ""
        updPatient.hometown = getPatientFieldByName(patientRecord, "hometown", "") || ""
        updPatient.dateOfBirth = isValid(new Date(patientDateOfBirth)) ? patientDateOfBirth : ""
        updPatient.additionalData = getPatientFieldByName(
          patientRecord,
          "additional_data",
          {},
        ) as Record<any, any>
        updPatient.governmentId = getPatientFieldByName(patientRecord, "government_id", "") || ""
        updPatient.externalPatientId =
          getPatientFieldByName(patientRecord, "external_patient_id", "") || ""

        updPatient.primaryClinicId = primaryClinicId || ""
        updPatient.lastModifiedBy = provider.id || ""
      })

      const patientAttributesRef = database.get<PatientAdditionalAttribute>(
        "patient_additional_attributes",
      )

      // console.log("Update: ", patientId, values)

      const attrQueries = fields
        // filter out base columns
        .filter((field) => !field.baseField)
        .flatMap(async (field) => {
          try {
            const attrs = await patientAttributesRef
              .query(Q.where("patient_id", patientId), Q.where("attribute_id", field.id))
              .fetch()

            if (attrs.length === 0) {
              // This is a new attribute, should create it
              const newAttr = patientAttributesRef.prepareCreate((ptAttr) => {
                ptAttr.patientId = ptQuery.id
                ptAttr.attributeId = field.id
                ptAttr.attribute = field.column
                ptAttr.metadata = {}
                if (field.fieldType === "number") {
                  ptAttr.numberValue = values[field.id] as number
                } else if (field.fieldType === "date") {
                  ptAttr.dateValue = values[field.id] as number
                } else if (field.fieldType === "boolean") {
                  ptAttr.booleanValue = values[field.id] as boolean
                } else {
                  ptAttr.stringValue = String(values[field.id] || "")
                }
              })
              return [newAttr]
            }
            return attrs.flatMap((attr) => {
              return attr.prepareUpdate((updAttr) => {
                updAttr.patientId = ptQuery.id
                updAttr.attributeId = field.id
                updAttr.attribute = field.column

                updAttr.metadata = {}

                if (field.fieldType === "number") {
                  updAttr.numberValue = values[field.id] as number
                } else if (field.fieldType === "date") {
                  updAttr.dateValue = values[field.id] as number
                } else if (field.fieldType === "boolean") {
                  updAttr.booleanValue = values[field.id] as boolean
                } else {
                  updAttr.stringValue = String(values[field.id] || "")
                }
              })
            })
          } catch (error) {
            Sentry.captureException(error)
            console.error(error)
            return []
          }
        })

      /** only update the attributes that resolved */
      const resolvedAttrQueries = await Promise.all(attrQueries)

      // commit the db changes
      return await database.write(async () => {
        return database.batch([ptQuery, ...resolvedAttrQueries.flat()])
      })
    }

    /**
    Delete a patient by id
    FIXME: Do all mark as deleted methods first set the "isDeleted" flag to true and set a deletedAt? or is that done at the server level?
    */
    export const deleteById = async (id: string) => {
      const patientRef = (
        await database.get<PatientModel>("patients").find(id)
      ).prepareMarkAsDeleted()

      const attrRef = (
        await database
          .get<PatientAdditionalAttribute>("patient_additional_attributes")
          .query(Q.where("patient_id", id))
          .fetch()
      ).map((attr) => {
        return attr.prepareMarkAsDeleted()
      })

      const appointmentsRef = (
        await database
          .get<AppointmentModel>("appointments")
          .query(Q.where("patient_id", id))
          .fetch()
      ).map((appointment) => appointment.prepareMarkAsDeleted())

      const visitsRef = (
        await database.get<VisitModel>("visits").query(Q.where("patient_id", id)).fetch()
      ).map((visit) => visit.prepareMarkAsDeleted())

      const eventsRef = (
        await database.get<EventModel>("events").query(Q.where("patient_id", id)).fetch()
      ).map((event) => event.prepareMarkAsDeleted())

      return database.write(async () => {
        return database.batch([
          patientRef,
          ...attrRef,
          ...appointmentsRef,
          ...visitsRef,
          ...eventsRef,
        ])
      })
    }
  }
}

export default Patient
