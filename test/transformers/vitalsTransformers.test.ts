import { Option } from "effect"
import {
  vitalsFromServer,
  vitalsToServer,
  createVitalsToServer,
  type ServerVitals,
} from "../../app/providers/transformers/vitalsTransformers"
import type { CreateVitalsInput } from "../../types/vitals"

const MOCK_SERVER_VITALS: ServerVitals = {
  id: "v1",
  patient_id: "p1",
  visit_id: "vis1",
  timestamp: "2024-06-15T10:00:00.000Z",
  systolic_bp: 120,
  diastolic_bp: 80,
  bp_position: "sitting",
  height_cm: 170,
  weight_kg: 70,
  bmi: 24.2,
  waist_circumference_cm: 85,
  heart_rate: 72,
  pulse_rate: 72,
  oxygen_saturation: 98,
  respiratory_rate: 16,
  temperature_celsius: 36.8,
  pain_level: 2,
  recorded_by_user_id: "user1",
  metadata: { source: "mobile" },
  is_deleted: false,
  created_at: "2024-06-15T10:00:00.000Z",
  updated_at: "2024-06-15T10:01:00.000Z",
  deleted_at: null,
}

describe("vitalsTransformers", () => {
  describe("vitalsFromServer", () => {
    it("maps snake_case server vitals to camelCase domain type", () => {
      const result = vitalsFromServer(MOCK_SERVER_VITALS)

      expect(result.id).toBe("v1")
      expect(result.patientId).toBe("p1")
      expect(Option.getOrNull(result.visitId)).toBe("vis1")
      expect(result.timestamp).toEqual(new Date("2024-06-15T10:00:00.000Z"))
      expect(Option.getOrNull(result.systolicBp)).toBe(120)
      expect(Option.getOrNull(result.diastolicBp)).toBe(80)
      expect(Option.getOrNull(result.bpPosition)).toBe("sitting")
      expect(Option.getOrNull(result.heightCm)).toBe(170)
      expect(Option.getOrNull(result.weightKg)).toBe(70)
      expect(Option.getOrNull(result.bmi)).toBe(24.2)
      expect(Option.getOrNull(result.heartRate)).toBe(72)
      expect(Option.getOrNull(result.oxygenSaturation)).toBe(98)
      expect(Option.getOrNull(result.temperatureCelsius)).toBe(36.8)
      expect(Option.getOrNull(result.painLevel)).toBe(2)
      expect(result.metadata).toEqual({ source: "mobile" })
      expect(result.isDeleted).toBe(false)
    })

    it("wraps null fields in Option.none()", () => {
      const serverWithNulls: ServerVitals = {
        ...MOCK_SERVER_VITALS,
        visit_id: null,
        systolic_bp: null,
        diastolic_bp: null,
        bp_position: null,
        deleted_at: null,
      }
      const result = vitalsFromServer(serverWithNulls)

      expect(Option.isNone(result.visitId)).toBe(true)
      expect(Option.isNone(result.systolicBp)).toBe(true)
      expect(Option.isNone(result.diastolicBp)).toBe(true)
      expect(Option.isNone(result.bpPosition)).toBe(true)
      expect(Option.isNone(result.deletedAt)).toBe(true)
    })
  })

  describe("round-trip: vitalsFromServer -> vitalsToServer", () => {
    it("preserves all fields through round-trip", () => {
      const domain = vitalsFromServer(MOCK_SERVER_VITALS)
      const backToServer = vitalsToServer(domain)

      expect(backToServer.id).toBe(MOCK_SERVER_VITALS.id)
      expect(backToServer.patient_id).toBe(MOCK_SERVER_VITALS.patient_id)
      expect(backToServer.visit_id).toBe(MOCK_SERVER_VITALS.visit_id)
      expect(backToServer.systolic_bp).toBe(MOCK_SERVER_VITALS.systolic_bp)
      expect(backToServer.diastolic_bp).toBe(MOCK_SERVER_VITALS.diastolic_bp)
      expect(backToServer.bp_position).toBe(MOCK_SERVER_VITALS.bp_position)
      expect(backToServer.height_cm).toBe(MOCK_SERVER_VITALS.height_cm)
      expect(backToServer.weight_kg).toBe(MOCK_SERVER_VITALS.weight_kg)
      expect(backToServer.bmi).toBe(MOCK_SERVER_VITALS.bmi)
      expect(backToServer.heart_rate).toBe(MOCK_SERVER_VITALS.heart_rate)
      expect(backToServer.oxygen_saturation).toBe(MOCK_SERVER_VITALS.oxygen_saturation)
      expect(backToServer.temperature_celsius).toBe(MOCK_SERVER_VITALS.temperature_celsius)
      expect(backToServer.pain_level).toBe(MOCK_SERVER_VITALS.pain_level)
      expect(backToServer.is_deleted).toBe(MOCK_SERVER_VITALS.is_deleted)
      expect(backToServer.metadata).toEqual(MOCK_SERVER_VITALS.metadata)
    })
  })

  describe("createVitalsToServer", () => {
    it("maps CreateVitalsInput to server payload", () => {
      const input: CreateVitalsInput = {
        patientId: "p1",
        visitId: Option.none(),
        timestamp: new Date("2024-06-15T10:00:00.000Z"),
        systolicBp: Option.some(120),
        diastolicBp: Option.some(80),
        bpPosition: Option.some("sitting" as const),
        heightCm: Option.some(170),
        weightKg: Option.some(70),
        bmi: Option.some(24.2),
        waistCircumferenceCm: Option.none(),
        heartRate: Option.none(),
        pulseRate: Option.none(),
        oxygenSaturation: Option.some(98),
        respiratoryRate: Option.none(),
        temperatureCelsius: Option.some(36.8),
        painLevel: Option.none(),
        recordedByUserId: Option.some("user1"),
        metadata: {},
        isDeleted: false,
      }

      const result = createVitalsToServer(input)

      expect(result.patient_id).toBe("p1")
      expect(result.visit_id).toBeUndefined()
      expect(result.systolic_bp).toBe(120)
      expect(result.diastolic_bp).toBe(80)
      expect(result.bp_position).toBe("sitting")
      expect(result.height_cm).toBe(170)
      expect(result.oxygen_saturation).toBe(98)
      expect(result.waist_circumference_cm).toBeUndefined()
      expect(result.heart_rate).toBeUndefined()
      expect(result.is_deleted).toBe(false)
    })
  })
})
