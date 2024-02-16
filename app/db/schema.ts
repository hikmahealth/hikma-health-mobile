import { appSchema, tableSchema } from "@nozbe/watermelondb"

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

export default appSchema({
  version: 1, // 🔥 IMPORTANT!! 🔥 when migrating dont forget to change this number
  tables: [
    patientSchema,
    clinicSchema,
    userSchema,
    visitSchema,
    eventSchema,
    eventFormSchema,
    registrationFormSchema,
  ],
})
