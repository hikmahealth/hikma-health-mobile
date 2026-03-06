import { appSchema, tableSchema } from "@nozbe/watermelondb"

// WatermelonDB does not support decimal type, so we use string
// The model then gets a nice "getXYZ" that returns a `parseFloat`
const decimal = "string"

const patientSchema = tableSchema({
  name: "patients",
  columns: [
    { name: "given_name", type: "string" },
    { name: "surname", type: "string" },
    { name: "date_of_birth", type: "string" }, // this is left as a string to better support the YYYY-MM-DD format TODO: change to number
    { name: "citizenship", type: "string" },
    { name: "hometown", type: "string" },
    { name: "phone", type: "string" },
    { name: "sex", type: "string" },
    { name: "camp", type: "string", isOptional: true },
    { name: "additional_data", type: "string" },
    { name: "metadata", type: "string" },
    { name: "photo_url", type: "string", isOptional: true },
    { name: "is_deleted", type: "boolean" }, // is stored as integer in old deployment
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },

    // V2
    { name: "government_id", type: "string" }, // government issued id
    { name: "external_patient_id", type: "string" }, // paitent id for the patient from external sources

    // V5
    { name: "primary_clinic_id", type: "string", isOptional: true, isIndexed: true }, // indexed column, we often query by this!
    { name: "last_modified_by", type: "string", isOptional: true },
  ],
})
// NOTE: Addresses will be stored in a separate table

const userSchema = tableSchema({
  name: "users",
  columns: [
    { name: "clinic_id", type: "string" },
    { name: "name", type: "string" },
    { name: "role", type: "string" },
    { name: "email", type: "string" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
  ],
})

const clinicSchema = tableSchema({
  name: "clinics",
  columns: [
    { name: "name", type: "string" },
    { name: "updated_at", type: "number" },
    { name: "created_at", type: "number" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "is_archived", type: "boolean" },
  ],
})

const eventSchema = tableSchema({
  name: "events",
  columns: [
    { name: "patient_id", type: "string", isIndexed: true },
    { name: "form_id", type: "string" },
    { name: "visit_id", type: "string", isIndexed: true },
    { name: "event_type", type: "string" },
    { name: "form_data", type: "string" }, // this is a JSON string that contains the filled out form as an Array of Objects
    { name: "metadata", type: "string" }, // this is a JSON string
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },

    // V9
    {
      name: "recorded_by_user_id",
      type: "string",
    },
  ],
})

const eventFormSchema = tableSchema({
  name: "event_forms",
  columns: [
    { name: "name", type: "string" },
    { name: "description", type: "string" },
    { name: "language", type: "string" },
    { name: "is_editable", type: "boolean" },
    { name: "is_snapshot_form", type: "boolean" },
    /** form_fields contains the actual form, dynamically created in the backend */
    { name: "form_fields", type: "string" },
    { name: "metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },

    // V9
    { name: "clinic_ids", type: "string" }, // JSON string as array of clinic_ids that are allowed to see the form. if its empy, all clinics are allowed - done for backwards compatibility., non-empty means only the specified are allowed to view the forms
    { name: "translations", type: "string", isOptional: true }, // JSON array of FieldTranslation objects for multilingual form support
  ],
})

/**
Visit stores the high level information about a visit, including the patient, clinic, provider, and check in time.
The actual form data is stored in the events table.
*/
const visitSchema = tableSchema({
  name: "visits",
  columns: [
    { name: "patient_id", type: "string", isIndexed: true },
    { name: "clinic_id", type: "string" },
    { name: "provider_id", type: "string" },
    /** storing provider_name because:
      1. provider names don't change, so there is no need to do an update in the future
      2. provider information (for other providers) is not stored in the on device database -
        saving the provider_name means the information is available for display for all
        other providers and admins
    */
    { name: "provider_name", type: "string" },
    { name: "check_in_timestamp", type: "number" },
    { name: "metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})

/**
A table containing different registration forms (usually only one is used for a single clinic) that can be used to register a patient.
The "fields" field contains the actual form, dynamically created in the backend.
The "fields" field has a subset of inputs that are mandatory and unchangable. These are the ones found in the patient schema above.
*/
const registrationFormSchema = tableSchema({
  name: "registration_forms",
  columns: [
    { name: "name", type: "string" },
    { name: "fields", type: "string" },
    { name: "metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})

const appointmentSchema = tableSchema({
  name: "appointments",
  columns: [
    { name: "provider_id", type: "string", isOptional: true },
    { name: "clinic_id", type: "string", isIndexed: true },
    { name: "patient_id", type: "string", isIndexed: true },
    { name: "user_id", type: "string" },
    { name: "current_visit_id", type: "string" },
    { name: "fulfilled_visit_id", type: "string", isOptional: true },

    // Timestamp is indexed to allow for faster read times when filtering by time.
    { name: "timestamp", type: "number", isIndexed: true },
    { name: "duration", type: "number", isOptional: true },
    { name: "reason", type: "string" },
    { name: "notes", type: "string" },

    { name: "is_walk_in", type: "boolean" },

    /**
     * departments data looks like this:
     * {
       id: string (department ID),
       name: string (department name),
       seen_at: string | null (ISO timestamp) defaults to null,
       seen_by: string | null (user ID) defaults to null,
       status: 'pending' | 'in_progress' | 'completed' default to 'pending'
     }
     */
    { name: "departments", type: "string" },

    // Status can be pending, confirmed, cancelled, or completed
    { name: "status", type: "string", isOptional: false },
    { name: "metadata", type: "string" }, // JSON medatadata field
    { name: "is_deleted", type: "boolean" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
    { name: "deleted_at", type: "number", isOptional: true },
  ],
})

const patient_additional_attributes = tableSchema({
  name: "patient_additional_attributes", // Assuming we're going with this table name
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
})

// V4
const prescriptionSchema = tableSchema({
  name: "prescriptions",
  columns: [
    { name: "patient_id", type: "string", isIndexed: true },
    { name: "provider_id", type: "string" },
    { name: "filled_by", type: "string", isOptional: true }, // doctor, nurse, pharmacist, other
    { name: "pickup_clinic_id", type: "string", isOptional: true }, // clinic id where the prescription is to be picked up
    { name: "visit_id", type: "string", isOptional: true }, // visit id when the prescription was filled
    { name: "priority", type: "string" }, // high, low, normal, emergency
    { name: "expiration_date", type: "number" }, // when the prescription expires
    { name: "prescribed_at", type: "number" }, // date
    { name: "filled_at", type: "number", isOptional: true }, // date when the prescription was filled
    { name: "status", type: "string" }, // pending, prepared, picked-up, not-picked-up, cancelled
    { name: "items", type: "string" }, // JSON field containing the medications
    { name: "notes", type: "string" }, // notes about the prescription

    { name: "metadata", type: "string" }, // JSON medatadata field
    { name: "is_deleted", type: "boolean" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
    { name: "deleted_at", type: "number", isOptional: true },
  ],
})

// V5
const patientVitalsSchema = tableSchema({
  name: "patient_vitals",
  columns: [
    { name: "patient_id", type: "string", isIndexed: true },
    { name: "visit_id", type: "string", isOptional: true },
    { name: "timestamp", type: "number" },
    { name: "systolic_bp", type: "number", isOptional: true },
    { name: "diastolic_bp", type: "number", isOptional: true },
    { name: "bp_position", type: "string", isOptional: true }, // sitting | standing | ...
    { name: "height_cm", type: "number", isOptional: true },
    { name: "weight_kg", type: "number", isOptional: true },
    { name: "bmi", type: "number", isOptional: true },
    { name: "waist_circumference_cm", type: "number", isOptional: true },
    { name: "heart_rate", type: "number", isOptional: true },
    { name: "pulse_rate", type: "number", isOptional: true }, // pulse rate is different from heart rate!
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

    // V7
    { name: "event_id", type: "string", isOptional: true },
  ],
})

const userClinicPermissionsSchema = tableSchema({
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

    // V9
    { name: "can_edit_other_provider_event", type: "boolean" },
    { name: "can_download_patient_reports", type: "boolean" },
    { name: "can_prescribe_medications", type: "boolean" },
    { name: "can_dispense_medications", type: "boolean" },
    { name: "can_delete_patient_visits", type: "boolean" },
    { name: "can_delete_patient_records", type: "boolean" },
  ],
})

const appConfigSchema = tableSchema({
  name: "app_config",
  columns: [
    { name: "namespace", type: "string" },
    { name: "key", type: "string" },
    { name: "value", type: "string" },
    { name: "data_type", type: "string" }, // default would be 'string'
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
    { name: "last_modified", type: "number" },
    { name: "last_modified_by", type: "string", isOptional: true },
    { name: "display_name", type: "string", isOptional: true },
  ],
})

const patientProblemsSchema = tableSchema({
  name: "patient_problems",
  columns: [
    { name: "patient_id", type: "string", isIndexed: true },
    { name: "visit_id", type: "string", isOptional: true },
    { name: "problem_code_system", type: "string" }, // icd10cm, snomed, icd11, icd10
    { name: "problem_code", type: "string" }, // E11.9 for diabetes or I10 for hypertension in icd10
    { name: "problem_label", type: "string" }, // 'Type 2 diabetes mellitus without complications', 'Essential (primary) hypertension'
    { name: "clinical_status", type: "string" }, // 'active', 'remission', 'resolved'
    { name: "verification_status", type: "string" }, // 'provisional', 'confirmed', 'refuted', 'unconfirmed'
    { name: "severity_score", type: "number", isOptional: true },
    { name: "onset_date", type: "number", isOptional: true }, // date as timestamp
    { name: "end_date", type: "number", isOptional: true }, // date as timestamp
    { name: "recorded_by_user_id", type: "string", isOptional: true },
    { name: "metadata", type: "string" }, // JSON field
    { name: "is_deleted", type: "boolean" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
    { name: "last_modified", type: "number" },
    { name: "server_created_at", type: "number" },
    { name: "deleted_at", type: "number", isOptional: true },
  ],
})

const clinicDepartmentsSchema = tableSchema({
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
})

// V7
const drugCatalogueSchema = tableSchema({
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
})

const clinicInventorySchema = tableSchema({
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

    // v8
    { name: "batch_number", type: "string" },
    { name: "batch_expiry_date", type: "number" },
  ],
})

const prescriptionItemsSchema = tableSchema({
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
})

const dispensingRecords = tableSchema({
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
})

// V9
const eventLogsSchema = tableSchema({
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
})

export const peersSchema = tableSchema({
  name: "peers",
  columns: [
    { name: "peer_id", type: "string", isIndexed: true },
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
})

export default appSchema({
  version: 9, // 🔥 IMPORTANT!! 🔥 when migrating dont forget to change this number
  tables: [
    patientSchema,
    clinicSchema,
    userSchema,
    visitSchema,
    eventSchema,
    eventFormSchema,
    registrationFormSchema,

    // New tables in V2
    patient_additional_attributes,

    // New tables in V3
    appointmentSchema,

    // New tables in v4
    prescriptionSchema,

    // New tables in v5
    patientVitalsSchema,
    userClinicPermissionsSchema,
    appConfigSchema,
    patientProblemsSchema,

    // New tables in v6
    clinicDepartmentsSchema,

    // new tables in v7
    drugCatalogueSchema,
    clinicInventorySchema,
    prescriptionItemsSchema,
    dispensingRecords,

    // new tables in v9
    eventLogsSchema,
    peersSchema,
  ],
})
