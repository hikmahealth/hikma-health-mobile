import { addColumns, createTable, schemaMigrations } from "@nozbe/watermelondb/Schema/migrations"

export default schemaMigrations({
  migrations: [
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
