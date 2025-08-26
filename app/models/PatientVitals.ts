import { Q } from "@nozbe/watermelondb"
import { Option } from "effect"

import database from "@/db"
import PatientVitalsModel from "@/db/model/PatientVitals"

namespace PatientVitals {
  export type BPPosition = "sitting" | "standing" | "lying" | "other"

  export type T = {
    id: string
    patientId: string
    visitId: Option.Option<string>
    timestamp: Date
    systolicBp: Option.Option<number>
    diastolicBp: Option.Option<number>
    bpPosition: Option.Option<BPPosition>
    heightCm: Option.Option<number>
    weightKg: Option.Option<number>
    bmi: Option.Option<number>
    waistCircumferenceCm: Option.Option<number>
    heartRate: Option.Option<number>
    pulseRate: Option.Option<number>
    oxygenSaturation: Option.Option<number>
    respiratoryRate: Option.Option<number>
    temperatureCelsius: Option.Option<number>
    painLevel: Option.Option<number>
    recordedByUserId: Option.Option<string>
    metadata: Record<string, any>
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Option.Option<Date>
  }

  /** Default empty PatientVitals Item */
  export const empty: T = {
    id: "",
    patientId: "",
    visitId: Option.none(),
    timestamp: new Date(),
    systolicBp: Option.none(),
    diastolicBp: Option.none(),
    bpPosition: Option.none(),
    heightCm: Option.none(),
    weightKg: Option.none(),
    bmi: Option.none(),
    waistCircumferenceCm: Option.none(),
    heartRate: Option.none(),
    pulseRate: Option.none(),
    oxygenSaturation: Option.none(),
    respiratoryRate: Option.none(),
    temperatureCelsius: Option.none(),
    painLevel: Option.none(),
    recordedByUserId: Option.none(),
    metadata: {},
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: Option.none(),
  }

  /**
   * Calculate BMI from height and weight
   * @param heightCm Height in centimeters
   * @param weightKg Weight in kilograms
   * @returns BMI value or null if calculation not possible
   */
  export const calculateBMI = (
    heightCm: number | undefined,
    weightKg: number | undefined,
  ): number | null => {
    if (!heightCm || !weightKg || heightCm <= 0) return null
    const heightM = heightCm / 100
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10
  }

  /**
   * Format blood pressure reading
   * @param systolic Systolic blood pressure
   * @param diastolic Diastolic blood pressure
   * @returns Formatted BP string or empty string
   */
  export const formatBloodPressure = (
    systolic: Option.Option<number>,
    diastolic: Option.Option<number>,
  ): string => {
    const sys = Option.getOrNull(systolic)
    const dia = Option.getOrNull(diastolic)
    if (sys && dia) {
      return `${sys}/${dia}`
    }
    return ""
  }

  /**
   * Convert temperature between Celsius and Fahrenheit
   * @param temp Temperature value
   * @param toFahrenheit If true, converts to Fahrenheit, otherwise to Celsius
   * @returns Converted temperature
   */
  export const convertTemperature = (temp: number, toFahrenheit: boolean = false): number => {
    if (toFahrenheit) {
      return Math.round((temp * 9) / 5 + 32)
    } else {
      return Math.round(((temp - 32) * 5) / 9)
    }
  }

  /**
   * Check if vital signs are within normal ranges
   * @param vitals Patient vitals
   * @returns Object with warnings for abnormal values
   */
  export const checkAbnormalVitals = (vitals: T): Record<string, string> => {
    const warnings: Record<string, string> = {}

    // Blood Pressure
    const systolic = Option.getOrNull(vitals.systolicBp)
    const diastolic = Option.getOrNull(vitals.diastolicBp)
    if (systolic) {
      if (systolic < 90) warnings.bloodPressure = "Low blood pressure"
      else if (systolic > 140) warnings.bloodPressure = "High blood pressure"
    }
    if (diastolic) {
      if (diastolic < 60) warnings.bloodPressure = "Low blood pressure"
      else if (diastolic > 90) warnings.bloodPressure = "High blood pressure"
    }

    // Heart Rate
    const heartRate = Option.getOrNull(vitals.heartRate)
    if (heartRate) {
      if (heartRate < 60) warnings.heartRate = "Bradycardia"
      else if (heartRate > 100) warnings.heartRate = "Tachycardia"
    }

    // Temperature
    const temp = Option.getOrNull(vitals.temperatureCelsius)
    if (temp) {
      if (temp < 36) warnings.temperature = "Hypothermia"
      else if (temp > 38) warnings.temperature = "Fever"
    }

    // Oxygen Saturation
    const o2Sat = Option.getOrNull(vitals.oxygenSaturation)
    if (o2Sat && o2Sat < 95) {
      warnings.oxygenSaturation = "Low oxygen saturation"
    }

    // Respiratory Rate
    const respRate = Option.getOrNull(vitals.respiratoryRate)
    if (respRate) {
      if (respRate < 12) warnings.respiratoryRate = "Bradypnea"
      else if (respRate > 20) warnings.respiratoryRate = "Tachypnea"
    }

    // BMI
    const bmi = Option.getOrNull(vitals.bmi)
    if (bmi) {
      if (bmi < 18.5) warnings.bmi = "Underweight"
      else if (bmi > 30) warnings.bmi = "Obese"
      else if (bmi > 25) warnings.bmi = "Overweight"
    }

    return warnings
  }

  export namespace DB {
    export type T = PatientVitalsModel

    /**
     * Create new patient vitals record
     * @param vitals Vitals data to create
     * @returns Promise with created vitals ID
     */
    export const create = async (
      vitals: Omit<PatientVitals.T, "id" | "createdAt" | "updatedAt" | "deletedAt">,
    ): Promise<string> => {
      return await database.write(async () => {
        const vitalsRecord = await database
          .get<PatientVitalsModel>("patient_vitals")
          .create((newVitals) => {
            newVitals.patientId = vitals.patientId
            newVitals.visitId = Option.getOrUndefined(vitals.visitId)
            newVitals.timestamp = vitals.timestamp
            newVitals.systolicBp = Option.getOrUndefined(vitals.systolicBp)
            newVitals.diastolicBp = Option.getOrUndefined(vitals.diastolicBp)
            newVitals.bpPosition = Option.getOrUndefined(vitals.bpPosition)
            newVitals.heightCm = Option.getOrUndefined(vitals.heightCm)
            newVitals.weightKg = Option.getOrUndefined(vitals.weightKg)
            newVitals.bmi = Option.getOrUndefined(vitals.bmi)
            newVitals.waistCircumferenceCm = Option.getOrUndefined(vitals.waistCircumferenceCm)
            newVitals.heartRate = Option.getOrUndefined(vitals.heartRate)
            newVitals.pulseRate = Option.getOrUndefined(vitals.pulseRate)
            newVitals.oxygenSaturation = Option.getOrUndefined(vitals.oxygenSaturation)
            newVitals.respiratoryRate = Option.getOrUndefined(vitals.respiratoryRate)
            newVitals.temperatureCelsius = Option.getOrUndefined(vitals.temperatureCelsius)
            newVitals.painLevel = Option.getOrUndefined(vitals.painLevel)
            newVitals.recordedByUserId = Option.getOrUndefined(vitals.recordedByUserId) || ""
            newVitals.metadata = vitals.metadata || {}
            newVitals.isDeleted = vitals.isDeleted || false
            // We never set the database fields like lastModified and serverCreatedAt
          })

        return vitalsRecord.id
      })
    }

    /**
     * Get latest vitals for a patient
     * @param patientId Patient ID
     * @returns Latest vitals record or none
     */
    export const getLatestForPatient = async (
      patientId: string,
    ): Promise<Option.Option<PatientVitals.T>> => {
      const vitals = await database
        .get<PatientVitalsModel>("patient_vitals")
        .query(
          Q.where("patient_id", patientId),
          Q.where("is_deleted", false),
          Q.sortBy("timestamp", Q.desc),
          Q.take(1),
        )
        .fetch()

      if (vitals.length === 0) {
        return Option.none()
      }

      return Option.some(fromDB(vitals[0]))
    }

    /**
     * Get all vitals for a patient
     * @param patientId Patient ID
     * @returns Array of vitals records
     */
    export const getAllForPatient = async (patientId: string): Promise<PatientVitals.T[]> => {
      const vitals = await database
        .get<PatientVitalsModel>("patient_vitals")
        .query(
          Q.where("patient_id", patientId),
          Q.where("is_deleted", false),
          Q.sortBy("timestamp", Q.desc),
        )
        .fetch()

      return vitals.map(fromDB)
    }

    /**
     * Get vitals for a specific visit
     * @param visitId Visit ID
     * @returns Array of vitals records
     */
    export const getForVisit = async (visitId: string): Promise<PatientVitals.T[]> => {
      const vitals = await database
        .get<PatientVitalsModel>("patient_vitals")
        .query(Q.where("visit_id", visitId), Q.where("is_deleted", false))
        .fetch()

      return vitals.map(fromDB)
    }

    /**
     * Subscribe to patient vitals updates
     * @param patientId Patient ID
     * @param callback Function called when vitals data updates
     * @returns Object containing unsubscribe function
     */
    export function subscribe(
      patientId: string,
      callback: (vitals: Option.Option<PatientVitals.T[]>, isLoading: boolean) => void,
    ): { unsubscribe: () => void } {
      let isLoading = true

      const subscription = database
        .get<PatientVitalsModel>("patient_vitals")
        .query(
          Q.where("patient_id", patientId),
          Q.where("is_deleted", false),
          Q.sortBy("timestamp", Q.desc),
        )
        .observe()
        .subscribe((dbVitals) => {
          const vitals = dbVitals.map(fromDB)
          callback(Option.fromNullable(vitals), isLoading)
          isLoading = false
        })

      return {
        unsubscribe: () => subscription.unsubscribe(),
      }
    }

    /**
     * Convert from PatientVitalsModel to PatientVitals.T
     * @param dbVitals The PatientVitalsModel to convert
     * @returns The converted PatientVitals.T
     */
    export const fromDB = (dbVitals: DB.T): PatientVitals.T => ({
      id: dbVitals.id,
      patientId: dbVitals.patientId,
      visitId: Option.fromNullable(dbVitals.visitId),
      timestamp: dbVitals.timestamp,
      systolicBp: Option.fromNullable(dbVitals.systolicBp),
      diastolicBp: Option.fromNullable(dbVitals.diastolicBp),
      bpPosition: Option.fromNullable(dbVitals.bpPosition as BPPosition),
      heightCm: Option.fromNullable(dbVitals.heightCm),
      weightKg: Option.fromNullable(dbVitals.weightKg),
      bmi: Option.fromNullable(dbVitals.bmi),
      waistCircumferenceCm: Option.fromNullable(dbVitals.waistCircumferenceCm),
      heartRate: Option.fromNullable(dbVitals.heartRate),
      pulseRate: Option.fromNullable(dbVitals.pulseRate),
      oxygenSaturation: Option.fromNullable(dbVitals.oxygenSaturation),
      respiratoryRate: Option.fromNullable(dbVitals.respiratoryRate),
      temperatureCelsius: Option.fromNullable(dbVitals.temperatureCelsius),
      painLevel: Option.fromNullable(dbVitals.painLevel),
      recordedByUserId: Option.fromNullable(dbVitals.recordedByUserId),
      metadata: dbVitals.metadata || {},
      isDeleted: dbVitals.isDeleted,
      createdAt: dbVitals.createdAt,
      updatedAt: dbVitals.updatedAt,
      deletedAt: Option.fromNullable(dbVitals.deletedAt),
    })
  }
}

export default PatientVitals
