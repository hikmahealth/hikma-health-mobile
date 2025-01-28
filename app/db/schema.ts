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

    // V2
    { name: "government_id", type: "string" }, // government issued id
    { name: "external_patient_id", type: "string" }, // paitent id for the patient from external sources
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

/**
 * FROM THE SERVER SIDE
    op.create_table(
        "appointments",
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('provider_id', sa.UUID(), nullable=True),
        sa.Column('clinic_id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('current_visit_id', sa.UUID(), nullable=False),
        sa.Column('fulfilled_visit_id', sa.UUID(), nullable=True),

        sa.Column('timestamp', sa.TIMESTAMP(True), nullable=False),

        # Duration in minutes, defaults to 60 minutes
        sa.Column('duration', sa.SmallInteger(), nullable=False, default=60),

        sa.Column('reason', sa.String(), nullable=False, default=""),
        sa.Column('notes', sa.String(), nullable=False, default=""),

        # Status can be pending, confirmed, cancelled, or completed
        sa.Column('status', sa.String(), nullable=False, default="pending"),

        sa.Column('metadata', sa.JSON(), nullable=False,
                  server_default=sa.text("'{}'::json")),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.TIMESTAMP(True),
                  nullable=False, default=datetime.now(UTC)),
        sa.Column('updated_at', sa.TIMESTAMP(True),
                  nullable=False, default=datetime.now(UTC)),
        sa.Column('deleted_at', sa.TIMESTAMP(True), nullable=True),
    )

    op.create_index("ix_timestamp", "appointments", ["timestamp"])

    op.create_primary_key("appointments_pkey", "appointments", ["id"])

    op.create_foreign_key("fk_appointment_clinic",
                          "appointments", "clinics", ["clinic_id"], ["id"])
    op.create_foreign_key("fk_appointment_patient",
                          "appointments", "patients", ["patient_id"], ["id"])
    op.create_foreign_key("fk_appointment_user",
                          "appointments", "users", ["user_id"], ["id"])
    op.create_foreign_key("fk_appointment_provider",
                          "appointments", "users", ["provider_id"], ["id"])
    op.create_foreign_key("fk_appointment_current_visit",
                          "appointments", "visits", ["current_visit_id"], ["id"])
    op.create_foreign_key("fk_appointment_fulfilled_visit",
                          "appointments", "visits", ["fulfilled_visit_id"], ["id"])


*/

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
  ]
})

export default appSchema({
  version: 4, // 🔥 IMPORTANT!! 🔥 when migrating dont forget to change this number
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
  ],
})
