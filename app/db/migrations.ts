import { addColumns, createTable, schemaMigrations } from "@nozbe/watermelondb/Schema/migrations"

export default schemaMigrations({
  migrations: [
    // V5
    // Patients Table:
    //  - Adds a primary_clinic_id column to the patients id
    //  - Adds a last_modified_by column to the patients table
    // Creates a new patient_vitals table
    // Creates a new user_clinic_permissions table
    // Creates a new app_config table
    // Creates a new patient_problems table
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "patients",
          columns: [
            { name: "primary_clinic_id", type: "string", isOptional: true, isIndexed: true }, // indexed column, we often query by this!
            { name: "last_modified_by", type: "string", isOptional: true },
          ],
        }),
        createTable({
          name: "patient_vitals",
          columns: [
            { name: "patient_id", type: "string", isIndexed: true },
            { name: "visit_id", type: "string", isOptional: true, isIndexed: true },
            { name: "timestamp", type: "number", isIndexed: true },
            { name: "systolic_bp", type: "number", isOptional: true },
            { name: "diastolic_bp", type: "number", isOptional: true },
            { name: "bp_position", type: "string", isOptional: true }, // sitting | standing | ...
            { name: "height_cm", type: "number", isOptional: true },
            { name: "weight_kg", type: "number", isOptional: true },
            { name: "bmi", type: "number", isOptional: true },
            { name: "waist_circumference_cm", type: "number", isOptional: true },
            { name: "heart_rate", type: "number", isOptional: true },
            { name: "pulse_rate", type: "number", isOptional: true },
            { name: "oxygen_saturation", type: "number", isOptional: true },
            { name: "respiratory_rate", type: "number", isOptional: true },
            { name: "temperature_celsius", type: "number", isOptional: true },
            { name: "pain_level", type: "number", isOptional: true },
            { name: "recorded_by_user_id", type: "string", isOptional: true },
            { name: "metadata", type: "string" }, // JSON field
            { name: "is_deleted", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "deleted_at", type: "number", isOptional: true },
          ],
        }),
        createTable({
          name: "user_clinic_permissions",
          columns: [
            { name: "user_id", type: "string", isIndexed: true },
            { name: "clinic_id", type: "string", isIndexed: true },
            { name: "can_register_patients", type: "boolean" },
            { name: "can_view_history", type: "boolean" },
            { name: "can_edit_records", type: "boolean" },
            { name: "can_delete_records", type: "boolean" },
            { name: "is_clinic_admin", type: "boolean" },
            { name: "created_by", type: "string", isOptional: true },
            { name: "last_modified_by", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "app_config",
          columns: [
            { name: "namespace", type: "string" },
            { name: "key", type: "string" },
            { name: "value", type: "string" },
            { name: "data_type", type: "string" }, // default would be 'string'
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "last_modified_by", type: "string", isOptional: true },
            { name: "display_name", type: "string", isOptional: true },
          ],
        }),
        createTable({
          name: "patient_problems",
          columns: [
            { name: "patient_id", type: "string", isIndexed: true },
            { name: "visit_id", type: "string", isOptional: true, isIndexed: true },
            { name: "problem_code_system", type: "string" }, // icd10cm, snomed, icd11, icd10
            { name: "problem_code", type: "string" }, // E11.9 for diabetes or I10 for hypertension in icd10
            { name: "problem_label", type: "string" }, // 'Type 2 diabetes mellitus without complications', 'Essential (primary) hypertension'
            { name: "clinical_status", type: "string", isIndexed: true }, // 'active', 'remission', 'resolved', 'unknown'
            { name: "verification_status", type: "string" }, // 'provisional', 'confirmed', 'refuted', 'unconfirmed'
            { name: "severity_score", type: "number", isOptional: true },
            { name: "onset_date", type: "number", isOptional: true }, // date as timestamp
            { name: "end_date", type: "number", isOptional: true }, // date as timestamp
            { name: "recorded_by_user_id", type: "string", isOptional: true },
            { name: "metadata", type: "string" }, // JSON field
            { name: "is_deleted", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "deleted_at", type: "number", isOptional: true },
          ],
        }),
      ],
    },
    // V4
    {
      toVersion: 4,
      steps: [
        createTable({
          name: "prescriptions",
          columns: [
            { name: "patient_id", type: "string", isIndexed: true },
            { name: "provider_id", type: "string" },
            { name: "pickup_clinic_id", type: "string", isOptional: true }, // clinic id where the prescription is to be picked up
            { name: "filled_by", type: "string", isOptional: true }, // doctor, nurse, pharmacist, other
            { name: "visit_id", type: "string", isOptional: true }, // visit id when the prescription was filled
            { name: "priority", type: "string" }, // high, low, normal, emergency
            { name: "expiration_date", type: "number" }, // when the prescription expires
            { name: "prescribed_at", type: "number" }, // date
            { name: "filled_at", type: "number", isOptional: true }, // date when the prescription was filled
            { name: "status", type: "string" }, // pending, prepared, picked-up, not-picked-up, cancelled, other
            { name: "items", type: "string" }, // JSON field containing the medications
            { name: "notes", type: "string" }, // notes about the prescription

            { name: "metadata", type: "string" }, // JSON medatadata field
            { name: "is_deleted", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "deleted_at", type: "number", isOptional: true },
          ],
        }),
      ],
    },
    // V3
    {
      toVersion: 3,
      steps: [
        createTable({
          name: "appointments",
          columns: [
            { name: "provider_id", type: "string" },
            { name: "clinic_id", type: "string", isIndexed: true },
            { name: "patient_id", type: "string", isIndexed: true },
            { name: "user_id", type: "string" },
            { name: "current_visit_id", type: "string" },
            { name: "fulfilled_visit_id", type: "string" },

            // Timestamp is indexed to allow for faster read times when filtering by time.
            { name: "timestamp", type: "number", isIndexed: true },
            { name: "duration", type: "number", isOptional: true },
            { name: "reason", type: "string" },
            { name: "notes", type: "string" },

            // Status can be pending, confirmed, cancelled, or completed
            { name: "status", type: "string", isOptional: false },
            { name: "metadata", type: "string" }, // JSON medatadata field
            { name: "is_deleted", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "deleted_at", type: "number", isOptional: true },
          ],
        }),
      ],
    },
    // V2
    {
      toVersion: 2,
      steps: [
        createTable({
          name: "patient_additional_attributes",
          columns: [
            { name: "patient_id", type: "string", isIndexed: true },

            { name: "attribute_id", type: "string", isIndexed: true }, // attribute_id is also the field id in the dynamic form
            { name: "attribute", type: "string" }, // storing the attribute name as a denormalized value to allow for faster read times in situations where accuracy is not needed

            { name: "number_value", type: "number", isOptional: true }, // Store numbers here if used
            { name: "string_value", type: "string", isOptional: true },
            { name: "date_value", type: "number", isOptional: true }, // Store dates as Unix timestamps
            { name: "boolean_value", type: "boolean", isOptional: true },

            { name: "metadata", type: "string" }, // JSON medatadata field
            { name: "is_deleted", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "last_modified", type: "number" },
            { name: "server_created_at", type: "number" },
            { name: "deleted_at", type: "number", isOptional: true },
          ],
        }),
        addColumns({
          table: "patients",
          columns: [
            { name: "government_id", type: "string" },
            { name: "external_patient_id", type: "string" },
          ],
        }),
      ],
    },
  ],
})
