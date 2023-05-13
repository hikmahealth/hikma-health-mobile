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

// TODO: There is an index??
// 'CREATE UNIQUE INDEX IF NOT EXISTS string_content_id_language_udx ON string_content (id, language);'

//  'CREATE TABLE IF NOT EXISTS patients (id varchar(32) PRIMARY KEY, given_name varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, surname varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, date_of_birth varchar(10), country varchar(32) REFERENCES string_ids(id), hometown varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, section varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, serial_number text, registered_by_provider_id text, phone text, sex varchar(1), image_timestamp text, updated_at text, deleted integer DEFAULT 0);',
const patientSchema = tableSchema({
  name: "patients",
  columns: [
    // {
    //   name: 'id',
    //   type: 'string',
    // },
    { name: "given_name", type: "string" },
    { name: "surname", type: "string" },
    { name: "date_of_birth", type: "string" }, // this is left as a string to better support the YYYY-MM-DD format
    { name: "country", type: "string" },
    { name: "hometown", type: "string" },
    { name: "phone", type: "string" },
    { name: "sex", type: "string" },
    { name: "camp", type: "string", isOptional: true },
    { name: "image_timestamp", type: "number" },
    { name: "is_deleted", type: "boolean" }, // is stored as integer in other deployment
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})

// 'CREATE TABLE IF NOT EXISTS users (id varchar(32) PRIMARY KEY, name varchar(32) REFERENCES string_ids(id) ON DELETE CASCADE, role text not null, email text not null, hashed_password text not null, instance_url text, updated_at text, deleted integer DEFAULT 0);',
const userSchema = tableSchema({
  name: "users",
  columns: [
    { name: "name", type: "string" },
    { name: "role", type: "string" },
    { name: "email", type: "string" },
    { name: "hashed_password", type: "string" },
    { name: "instance_url", type: "string" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
    { name: "is_deleted", type: "boolean" },
  ],
})

const clinicSchema = tableSchema({
  name: "clinics",
  columns: [
    { name: "name", type: "string" },
    { name: "updated_at", type: "number" },
    { name: "created_at", type: "number" },
    { name: "is_deleted", type: "boolean" },
  ],
})

// 'CREATE TABLE IF NOT EXISTS events (id varchar(32) PRIMARY KEY, patient_id varchar(32) REFERENCES patients(id) ON DELETE CASCADE, visit_id varchar(32) REFERENCES visits(id) ON DELETE CASCADE, event_type text, event_timestamp text, updated_at text, event_metadata text, deleted integer DEFAULT 0);',
const eventSchema = tableSchema({
  name: "events",
  columns: [
    { name: "patient_id", type: "string" },
    { name: "visit_id", type: "string" },
    { name: "event_type", type: "string" },
    { name: "event_metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})


/* CREATE TABLE event_forms (
            id uuid PRIMARY KEY,
            name TEXT,
            description TEXT,
            language TEXT NOT NULL default 'en',
            metadata JSONB NOT NULL DEFAULT '{}',
            created_at timestamp with time zone default now(),
            updated_at timestamp with time zone default now()
        );
*/
const eventFormSchema = tableSchema({
  name: "event_forms",
  columns: [
    { name: "name", type: "string" },
    { name: "description", type: "string" },
    { name: "language", type: "string" },
    { name: "metadata", type: "string" },
    { name: "is_deleted", type: "boolean" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ]
})


// 'CREATE TABLE IF NOT EXISTS visits (id varchar(32) PRIMARY KEY, patient_id varchar(32) REFERENCES patients(id) ON DELETE CASCADE, clinic_id varchar(32) REFERENCES clinics(id) ON DELETE CASCADE, provider_id varchar(32) REFERENCES users(id) ON DELETE CASCADE, check_in_timestamp text, updated_at text, deleted integer DEFAULT 0);',
const visitSchema = tableSchema({
  name: "visits",
  columns: [
    { name: "patient_id", type: "string" },
    { name: "clinic_id", type: "string" },
    { name: "provider_id", type: "string" },
    { name: "check_in_timestamp", type: "number" },
    { name: "is_deleted", type: "boolean" },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})

export default appSchema({
  version: 1,
  tables: [
    stringIdSchema,
    stringContentSchema,
    patientSchema,
    clinicSchema,
    userSchema,
    visitSchema,
    eventSchema,
    eventFormSchema
  ],
})

// TODO: Verify whether or not it is possible to create a new record with an id in the schema

// CHANGES:
// 1. deleted field changed to is_deleted and its datatype from integet to boolean
// 2. all dates, other than date of birth, have changed to type number
// 2.a the dates that were in ISO format are now UNIX timestamps
