import { appSchema, tableSchema } from "@nozbe/watermelondb"

// 'CREATE TABLE IF NOT EXISTS string_ids (id varchar(32) PRIMARY KEY);',

const stringIdSchema = tableSchema({
  name: "string_ids",
  // columns: [{name: 'id', type: 'string'}],
  columns: [],
})

const stringContentSchema = tableSchema({
  name: "string_content",
  columns: [
    { name: "string_id", type: "string", isIndexed: true },
    { name: "language", type: "string" },
    { name: "content", type: "string" },
    { name: "updated_at", type: "number" },
  ],
})

const patientSchema = tableSchema({
  name: "patients",
  columns: [
    { name: "given_name", type: "string" },
    { name: "surname", type: "string" },
    { name: "date_of_birth", type: "string" }, // this is left as a string to better support the YYYY-MM-DD format
    { name: "country", type: "string" },
    { name: "hometown", type: "string" },
    { name: "phone", type: "string" },
    { name: "sex", type: "string" },
    { name: "camp", type: "string", isOptional: true },
    { name: "additional_data", type: "string" },
    { name: "metadata", type: "string" },
    { name: "image_timestamp", type: "number" },
    { name: "is_deleted", type: "boolean" }, // is stored as integer in old deployment
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})

const userSchema = tableSchema({
  name: "users",
  columns: [
    { name: "name", type: "string" },
    { name: "role", type: "string" },
    { name: "email", type: "string" },
    { name: "hashed_password", type: "string" }, // not used
    { name: "instance_url", type: "string" },
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
    { name: "patient_id", type: "string" },
    { name: "visit_id", type: "string" },
    { name: "event_type", type: "string" },
    { name: "event_metadata", type: "string" },
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
    { name: "metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ]
})


const visitSchema = tableSchema({
  name: "visits",
  columns: [
    { name: "patient_id", type: "string" },
    { name: "clinic_id", type: "string" },
    { name: "provider_id", type: "string" },
    { name: "provider_name", type: "string" },
    { name: "check_in_timestamp", type: "number" },
    { name: "metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "deleted_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})


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
  ]
})

export default appSchema({
  version: 1, // 🔥 when migrating dont forget to change this number
  tables: [
    stringIdSchema,
    stringContentSchema,
    patientSchema,
    clinicSchema,
    userSchema,
    visitSchema,
    eventSchema,
    eventFormSchema,
    registrationFormSchema
  ],
})

// CHANGES: FOR USERS MIGRATING FROM V1 to V2
// 1. deleted field changed to is_deleted and its datatype from integet to boolean
// 2. all dates, other than date of birth, have changed to type number
// 2.a the dates that were in ISO format are now UNIX timestamps
