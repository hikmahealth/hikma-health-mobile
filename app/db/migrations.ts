import { addColumns, createTable, schemaMigrations } from "@nozbe/watermelondb/Schema/migrations"

export default schemaMigrations({
  migrations: [
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
