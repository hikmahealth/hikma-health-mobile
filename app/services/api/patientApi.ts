import { ApisauceInstance, create } from "apisauce"
import Config from "../../config"
import type { ApiConfig } from "./api.types"
import PatientModel, { PatientModelData } from "app/db/model/Patient"
import { database } from "app/db"
import { SyncDatabaseChangeSet, SyncPullResult, SyncPushResult } from "@nozbe/watermelondb/sync"
import { MigrationSyncChanges } from "@nozbe/watermelondb/Schema/migrations/getSyncChanges"
import { Q } from "@nozbe/watermelondb"
import PatientAdditionalAttribute from "app/db/model/PatientAdditionalAttribute"
import RegistrationFormModel, { RegistrationFormField } from "app/db/model/PatientRegistrationForm"
import { DEFAULT_API_CONFIG } from "./api"
import { PatientRecord } from "app/types"
import { getAdditionalFieldColumnName, getPatientFieldByName } from "app/utils/patient"
import { camelCase } from "lodash"
import { format } from "date-fns"

/**
Manage all patient related queries locally
*/
export class PatientApi {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
  Set our API instance
  */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    })
  }

  /**
  Register a new patient
  @param {PatientRecord} patientRecord
  @returns {Promise<PatientModel["id"]>}
  */
  async register(patientRecord: PatientRecord): Promise<PatientModel["id"]> {
    //
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
  async checkGovtIdExists(governmentId: string): Promise<boolean> {
    try {
      const patients = await database
        .get<PatientModel>("patients")
        .query(Q.where("government_id", governmentId))
        .fetch()

      console.log({ patients })

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
  @returns {Promise<PatientRecord>}
  */
  async getByGovernmentId(
    governmentId: string,
    formFields: RegistrationFormField[],
  ): Promise<PatientRecord> {
    const patientRecord: PatientRecord = {
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
      const values = additionalFields.reduce((prev, field) => {
        const key = field.attributeId
        if (key in prev) {
          console.warn("Additional patient field duplicate detected. Overwiting with newer record")
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
      }, {} as PatientRecord["values"])

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
  @returns {Promise<PatientRecord>}
  */
  async getById(id: string, formFields: RegistrationFormField[]): Promise<PatientRecord> {
    const patientRecord: PatientRecord = {
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
      const values = additionalFields.reduce((prev, field) => {
        const key = field.attributeId
        if (key in prev) {
          console.warn("Additional patient field duplicate detected. Overwiting with newer record")
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
      }, {} as PatientRecord["values"])

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
  @param patientRecord {PatientRecord}
  */
  async updateById(patientId: string, patientRecord: PatientRecord) {
    const { fields, values } = patientRecord

    // prepare the patient record

    const patient = await database.get<PatientModel>("patients").find(patientId)
    const ptQuery = patient.prepareUpdate((updPatient) => {
      updPatient.givenName = getPatientFieldByName(patientRecord, "given_name", "") || ""
      updPatient.surname = getPatientFieldByName(patientRecord, "surname", "") || ""
      updPatient.sex = getPatientFieldByName(patientRecord, "sex", "") || ""
      updPatient.phone = getPatientFieldByName(patientRecord, "phone", "") || ""
      updPatient.citizenship = getPatientFieldByName(patientRecord, "citizenship", "") || ""
      updPatient.photoUrl = getPatientFieldByName(patientRecord, "photo_url", "") || ""
      updPatient.camp = getPatientFieldByName(patientRecord, "camp", "") || ""
      updPatient.hometown = getPatientFieldByName(patientRecord, "hometown", "") || ""
      updPatient.dateOfBirth = format(
        new Date(
          getPatientFieldByName(patientRecord, "date_of_birth", new Date()) || new Date(),
        ).getTime(),
        "yyyy-MM-dd",
      )
      updPatient.additionalData = getPatientFieldByName(
        patientRecord,
        "additional_data",
        {},
      ) as Record<any, any>
      updPatient.governmentId = getPatientFieldByName(patientRecord, "government_id", "") || ""
      updPatient.externalPatientId =
        getPatientFieldByName(patientRecord, "external_patient_id", "") || ""
    })

    const patientAttributesRef = database.get<PatientAdditionalAttribute>(
      "patient_additional_attributes",
    )

    const attrQueries = fields
      // filter out base columns
      .filter((field) => !field.baseField)
      .flatMap(async (field) => {
        try {
          const attrs = await patientAttributesRef
            .query(Q.where("patient_id", patientId), Q.where("attribute_id", field.id))
            .fetch()
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
  */
  async deleteById(id: string) {
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

    return database.write(async () => {
      return database.batch([patientRef, ...attrRef])
    })
  }
}

// Singleton instance of the API for convenience
export const patientApi = new PatientApi()
