import { addColumns, createTable, schemaMigrations } from "@nozbe/watermelondb/Schema/migrations"

const decimal = "string"

export default schemaMigrations({
  migrations: [
    // V9
    {
      toVersion: 9,
      steps: [
        createTable({
          name: "event_logs",
          columns: [
            { name: "transaction_id", type: "string" },
            { name: "action_type", type: "string" }, // ActionType
            { name: "table_name", type: "string" },
            { name: "row_id", type: "string" },
            { name: "changes", type: "string" }, // JSON stringified diff
            { name: "device_id", type: "string" },
            { name: "app_id", type: "string" },
            { name: "user_id", type: "string" },
            { name: "ip_address", type: "string", isOptional: true },
            { name: "hash", type: "string" },
            { name: "metadata", type: "string", isOptional: true },
            { name: "synced", type: "boolean" },
            { name: "created_at", type: "number" },
          ],
        }),
        createTable({
          name: "peers",
          columns: [
            { name: "peer_id", type: "string" },
            { name: "name", type: "string" },
            { name: "ip_address", type: "string", isOptional: true },
            { name: "port", type: "number", isOptional: true },
            { name: "public_key", type: "string" },
            { name: "last_synced_at", type: "number", isOptional: true },
            { name: "peer_type", type: "string" }, // hub | cloud_server | mobile_app
            { name: "is_leader", type: "boolean" },
            { name: "status", type: "string" }, // active | revoked | untrusted
            { name: "protocol_version", type: "string" },
            { name: "metadata", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        addColumns({
          table: "events",
          columns: [
            {
              name: "recorded_by_user_id",
              type: "string",
            },
          ],
        }),
        addColumns({
          table: "user_clinic_permissions",
          columns: [
            { name: "can_edit_other_provider_event", type: "boolean" },
            { name: "can_download_patient_reports", type: "boolean" },
            { name: "can_prescribe_medications", type: "boolean" },
            { name: "can_dispense_medications", type: "boolean" },
            { name: "can_delete_patient_visits", type: "boolean" },
            { name: "can_delete_patient_records", type: "boolean" },
          ],
        }),
        addColumns({
          table: "event_forms",
          columns: [
            { name: "clinic_ids", type: "string" },
            { name: "translations", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    // V8
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: "clinic_inventory",
          columns: [
            { name: "batch_number", type: "string" },
            { name: "batch_expiry_date", type: "number" },
          ],
        }),
      ],
    },
    // V7
    // Adds event_id to patient_vitals table
    // Creates a new clinic_inventory table
    // New prescrption items table that expands out the "items" of a prescription into their own table.
    // - This is part of the effort to add inventory management, more robust prescripton and pharmacy process. and to bring patient level records.
    // New dispensing records - tracks medication dispensing events and actions.
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: "patient_vitals",
          columns: [{ name: "event_id", type: "string", isOptional: true }],
        }),
        createTable({
          name: "drug_catalogue",
          columns: [
            { name: "barcode", type: "string", isOptional: true, isIndexed: true },
            { name: "generic_name", type: "string" },
            { name: "brand_name", type: "string", isOptional: true },
            { name: "form", type: "string" },
            { name: "route", type: "string" },
            { name: "dosage_quantity", type: decimal },
            { name: "dosage_units", type: "string" },
            { name: "manufacturer", type: "string", isOptional: true },
            { name: "sale_price", type: decimal },
            { name: "sale_currency", type: "string", isOptional: true },
            { name: "min_stock_level", type: "number" },
            { name: "max_stock_level", type: "number", isOptional: true },
            { name: "is_controlled", type: "boolean" },
            { name: "requires_refrigeration", type: "boolean" },
            { name: "is_active", type: "boolean" },
            { name: "notes", type: "string", isOptional: true },
            { name: "recorded_by_user_id", type: "string", isOptional: true },
            { name: "metadata", type: "string" },
            { name: "is_deleted", type: "boolean" },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "last_modified", type: "number" },
            { name: "server_created_at", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "clinic_inventory",
          columns: [
            { name: "clinic_id", type: "string" },
            { name: "drug_id", type: "string", isIndexed: true },
            { name: "batch_id", type: "string" },
            { name: "quantity_available", type: "number" },
            { name: "reserved_quantity", type: "number" },
            { name: "last_counted_at", type: "number", isOptional: true },
            { name: "recorded_by_user_id", type: "string", isOptional: true },
            { name: "metadata", type: "string" },
            { name: "is_deleted", type: "boolean" },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "last_modified", type: "number" },
            { name: "server_created_at", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
        createTable({
          name: "prescription_items",
          columns: [
            { name: "prescription_id", type: "string", isIndexed: true },
            { name: "patient_id", type: "string", isIndexed: true },
            { name: "drug_id", type: "string", isIndexed: true },
            { name: "clinic_id", type: "string" }, // similar to pickup_clinic_id from the prescription item
            { name: "dosage_instructions", type: "string" },
            { name: "quantity_prescribed", type: "number" },
            { name: "quantity_dispensed", type: "number" },
            { name: "refills_authorized", type: "number" },
            { name: "refills_used", type: "number" },
            { name: "item_status", type: "string" }, //
            { name: "notes", type: "string", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "recorded_by_user_id", type: "string", isOptional: true },
            { name: "metadata", type: "string" },
            { name: "is_deleted", type: "boolean" },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "last_modified", type: "number" },
            { name: "server_created_at", type: "number", isOptional: true },
          ],
        }),
        createTable({
          name: "dispensing_records",
          columns: [
            { name: "clinic_id", type: "string", isIndexed: true },
            { name: "drug_id", type: "string", isIndexed: true },
            { name: "batch_id", type: "string", isOptional: true },
            { name: "prescription_item_id", type: "string", isOptional: true, isIndexed: true },
            { name: "patient_id", type: "string", isIndexed: true },
            { name: "quantity_dispensed", type: "number" },
            { name: "dosage_instructions", type: "string", isOptional: true },
            { name: "days_supply", type: "number", isOptional: true },
            { name: "dispensed_by", type: "string", isIndexed: true },
            { name: "dispensed_at", type: "number", isIndexed: true },
            { name: "recorded_by_user_id", type: "string", isOptional: true },
            { name: "metadata", type: "string" },
            { name: "is_deleted", type: "boolean" },
            { name: "deleted_at", type: "number", isOptional: true },
            { name: "last_modified", type: "number" },
            { name: "server_created_at", type: "number", isOptional: true },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
          ],
        }),
      ],
    },
    // V6
    // Clinics Table:
    //  - Adds an is_archived column to the clinics table
    // Creates a new clinic_departments table
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: "appointments",
          columns: [{ name: "is_walk_in", type: "boolean" }],
        }),
        addColumns({
          table: "clinics",
          columns: [{ name: "is_archived", type: "boolean" }],
        }),
        createTable({
          name: "clinic_departments",
          columns: [
            { name: "clinic_id", type: "string", isIndexed: true },
            { name: "name", type: "string" },
            { name: "code", type: "string", isOptional: true }, // Short code like "CARDIO", "PEDS", "ER", "ICU", "OPD", "LAB"
            { name: "description", type: "string", isOptional: true },
            { name: "status", type: "string" }, // active, inactive, maintenance

            // Core capabilities as booleans
            { name: "can_dispense_medications", type: "boolean" },
            { name: "can_perform_labs", type: "boolean" },
            { name: "can_perform_imaging", type: "boolean" },

            // Future flexibility - JSON string on mobile (jsonb on server)
            { name: "additional_capabilities", type: "string" }, // JSON array as string

            // Metadata for flexible department-specific data
            { name: "metadata", type: "string" }, // JSON object as string

            // Audit and soft-delete columns
            { name: "is_deleted", type: "boolean" },
            { name: "created_at", type: "number" },
            { name: "updated_at", type: "number" },
            { name: "last_modified", type: "number" },
            { name: "server_created_at", type: "number" },
            { name: "deleted_at", type: "number", isOptional: true },
          ],
        }),
      ],
    },
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
