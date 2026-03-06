# Patient Registration & Records System — Implementation Guide for Rust/SQLite Hub

This document describes how patient registration, storage, querying, and dynamic form fields work in the WatermelonDB-based mobile app. The Rust-powered SQLite hub must replicate this behavior faithfully since both share the same backing SQLite database format.

---

## 1. Database Tables

### 1.1 `patients` Table

The core patient table stores fixed demographic fields directly as columns:

| Column | SQLite Type | Notes |
|--------|------------|-------|
| `id` | TEXT PRIMARY KEY | UUIDv7 |
| `given_name` | TEXT | |
| `surname` | TEXT | |
| `date_of_birth` | TEXT | Stored as `"yyyy-MM-dd"` string |
| `citizenship` | TEXT | |
| `hometown` | TEXT | |
| `phone` | TEXT | |
| `sex` | TEXT | Values: `"male"`, `"female"` |
| `camp` | TEXT | Refugee camp / location |
| `photo_url` | TEXT | Optional |
| `government_id` | TEXT | Should be unique (validated at app level) |
| `external_patient_id` | TEXT | ID from external systems |
| `additional_data` | TEXT | JSON string — `Record<string, any>` |
| `metadata` | TEXT | JSON string — `Record<string, any>` |
| `primary_clinic_id` | TEXT (INDEXED) | FK to clinics. Frequently queried for permissions |
| `last_modified_by` | TEXT | User ID who last modified |
| `is_deleted` | INTEGER | 0 or 1 (soft delete) |
| `deleted_at` | INTEGER | Unix timestamp in milliseconds (nullable) |
| `created_at` | INTEGER | Unix timestamp in ms (set on create, read-only) |
| `updated_at` | INTEGER | Unix timestamp in ms (auto-updated) |

**WatermelonDB internal columns** (also present in SQLite):
- `_status` — `"synced"`, `"created"`, `"updated"`, `"deleted"`
- `_changed` — CSV of changed column names (e.g. `"given_name,phone"`)

### 1.2 `patient_additional_attributes` Table

Stores dynamic/custom patient fields defined by the registration form. Each row is one attribute for one patient.

| Column | SQLite Type | Notes |
|--------|------------|-------|
| `id` | TEXT PRIMARY KEY | UUIDv7 |
| `patient_id` | TEXT (INDEXED) | FK to patients |
| `attribute_id` | TEXT (INDEXED) | References the field's `id` in the registration form |
| `attribute` | TEXT | Denormalized column/field name from the form |
| `number_value` | REAL | Used when `fieldType === "number"` |
| `string_value` | TEXT | Used when `fieldType === "text"` or `"select"` |
| `date_value` | INTEGER | Unix timestamp ms, used when `fieldType === "date"` |
| `boolean_value` | INTEGER | 0/1, used when `fieldType === "boolean"` |
| `metadata` | TEXT | JSON string |
| `is_deleted` | INTEGER | Soft delete |
| `deleted_at` | INTEGER | Unix timestamp ms |
| `created_at` | INTEGER | Unix timestamp ms |
| `updated_at` | INTEGER | Unix timestamp ms |
| `_status` | TEXT | WatermelonDB sync tracking |
| `_changed` | TEXT | WatermelonDB sync tracking |

**Key design**: Only ONE value column is populated per row, determined by the field's `fieldType`. The others remain null/default.

### 1.3 `registration_forms` Table

Defines the patient registration form structure. There is typically **one row** in this table.

| Column | SQLite Type | Notes |
|--------|------------|-------|
| `id` | TEXT PRIMARY KEY | |
| `name` | TEXT | Form name |
| `fields` | TEXT | **JSON array of `RegistrationFormField` objects** |
| `metadata` | TEXT | JSON string |
| `is_deleted` | INTEGER | |
| `deleted_at` | INTEGER | |
| `created_at` | INTEGER | |
| `updated_at` | INTEGER | |
| `_status` | TEXT | |
| `_changed` | TEXT | |

### 1.4 Related Tables

```
patients (1) ──→ (N) visits
patients (1) ──→ (N) patient_additional_attributes
patients (1) ──→ (N) patient_vitals
patients (1) ──→ (N) patient_problems
patients (1) ──→ (N) appointments
visits   (1) ──→ (N) events
```

---

## 2. Registration Form Field Structure

The `registration_forms.fields` column contains a JSON array. Each element is a `RegistrationFormField`:

```json
{
  "id": "uuid-string",
  "position": 0,
  "column": "given_name",
  "label": { "en": "First Name", "ar": "الاسم الأول", "es": "Nombre" },
  "fieldType": "text",
  "options": [],
  "required": true,
  "baseField": true,
  "visible": true,
  "isSearchField": true,
  "deleted": false
}
```

### Field Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string (UUID) | Unique identifier for this field. Used as key in `patient_additional_attributes.attribute_id` and in form value maps |
| `position` | number | Display/sort order |
| `column` | string | For base fields: the snake_case column name in `patients` table. For dynamic fields: a descriptive name stored in `attribute` column |
| `label` | `{ en: string, ar?: string, es?: string, [lang]: string }` | Multilingual display labels |
| `fieldType` | `"text" \| "number" \| "select" \| "date" \| "boolean"` | Determines input type AND which value column to use in `patient_additional_attributes` |
| `options` | `TranslationObject[]` | For `"select"` fields — each option has multilingual labels |
| `required` | boolean | Whether the field is required during registration |
| `baseField` | boolean | **Critical flag**: `true` = stored directly as a column in `patients` table. `false` = stored in `patient_additional_attributes` table |
| `visible` | boolean | Admin-controlled visibility toggle |
| `isSearchField` | boolean | Whether this field appears in advanced search UI |
| `deleted` | boolean | Soft delete for the field definition itself |

### Base Columns (baseField = true)

These fields map directly to columns in the `patients` table:

```
given_name, surname, date_of_birth, sex, phone, citizenship,
camp, government_id, external_patient_id, primary_clinic_id
```

The form field's `column` property matches the snake_case column name. When reading from the WatermelonDB model, these are accessed via camelCase (e.g., `patient.givenName` for `given_name`).

### Dynamic Columns (baseField = false)

Any field where `baseField === false` is stored in the `patient_additional_attributes` table. The field's `id` becomes the `attribute_id`, and the value goes into the type-appropriate column.

---

## 3. Value Column Mapping

When storing or retrieving a dynamic attribute, the system maps `fieldType` to the correct column:

```
fieldType    →  Column used
─────────────────────────────
"number"     →  number_value
"text"       →  string_value
"select"     →  string_value
"date"       →  date_value
"boolean"    →  boolean_value
(default)    →  string_value
```

This is implemented in `getAdditionalFieldColumnName(fields, attributeId)`:

```typescript
function getAdditionalFieldColumnName(fields, attributeId): PatientValueColumn {
  const attr = fields.find(f => f.id === attributeId)
  if (!attr) return "string_value" // fallback

  if (attr.fieldType === "number")                     return "number_value"
  if (attr.fieldType === "select" || attr.fieldType === "text") return "string_value"
  if (attr.fieldType === "date")                       return "date_value"
  if (attr.fieldType === "boolean")                    return "boolean_value"

  return "string_value"
}
```

---

## 4. Patient Registration Flow

### 4.1 Creating a Patient (Offline/WatermelonDB Path)

Input: `PatientRecord = { fields: RegistrationFormField[], values: Record<fieldId, value> }`

```
Patient.DB.register(patientRecord, provider, clinic):

  1. PERMISSION CHECK
     - Resolve primaryClinicId from form values (fallback to clinic.id)
     - Query user_clinic_permissions for provider.id with "canRegisterPatients"
     - Reject if user lacks permission for that clinic

  2. PREPARE PATIENT ROW
     - For each base field, extract value from patientRecord by column name
     - Column lookup: find form field where field.column === columnName,
       then read patientRecord.values[field.id]
     - Fields mapped:
       given_name, surname, sex, phone, citizenship, photo_url, camp,
       hometown, government_id, external_patient_id, primary_clinic_id
     - Special: date_of_birth is formatted as "yyyy-MM-dd" string
     - Special: additional_data is extracted as a JSON object
     - Set last_modified_by = provider.id

  3. PREPARE ADDITIONAL ATTRIBUTE ROWS
     - Filter form fields where baseField === false
     - For each dynamic field:
       - Create row in patient_additional_attributes
       - Set patient_id = new patient's id
       - Set attribute_id = field.id
       - Set attribute = field.column (denormalized name)
       - Set value in the correct column based on fieldType:
         * "number" → numberValue = values[field.id]
         * "date"   → dateValue = values[field.id]  (as unix timestamp)
         * "boolean" → booleanValue = values[field.id]
         * else     → stringValue = String(values[field.id] || "")
       - Set metadata = {}

  4. ATOMIC BATCH WRITE
     - Write patient row + all attribute rows in a single database.batch()
     - This ensures atomicity — either all succeed or none
     - Return the new patient's id
```

### 4.2 Updating a Patient

```
Patient.DB.updateById(patientId, patientRecord, provider, clinic):

  1. PERMISSION CHECK
     - Same as register but checks "canEditRecords" permission

  2. FETCH EXISTING PATIENT
     - database.get("patients").find(patientId)

  3. PREPARE PATIENT UPDATE
     - Same field mapping as register (given_name, surname, etc.)
     - Special: date_of_birth validated with isValid(new Date(value))

  4. PREPARE ADDITIONAL ATTRIBUTE UPDATES
     - For each dynamic field (baseField === false):
       a. Query existing attribute:
          WHERE patient_id = patientId AND attribute_id = field.id
       b. If NO existing attribute found:
          → CREATE new attribute row (same as register)
       c. If existing attribute(s) found:
          → UPDATE each one with new value in the correct column

  5. RESOLVE ALL ASYNC QUERIES
     - The attribute updates involve async lookups
     - Use Promise.all() to resolve before batching

  6. ATOMIC BATCH WRITE
     - Batch patient update + all attribute creates/updates
```

### 4.3 Deleting a Patient (Cascading Soft Delete)

```
Patient.DB.deleteById(patientId):

  1. Mark patient as deleted (prepareMarkAsDeleted)
  2. Mark all patient_additional_attributes WHERE patient_id = id
  3. Mark all appointments WHERE patient_id = id
  4. Mark all visits WHERE patient_id = id
  5. Mark all events WHERE patient_id = id
  6. Batch all operations atomically

  Note: Uses WatermelonDB's prepareMarkAsDeleted() which sets
  _status = "deleted" for sync propagation
```

---

## 5. Patient Retrieval / Reconstruction

### 5.1 Get Patient by ID (for editing)

Returns a `PatientRecord` with both form definition and current values:

```
Patient.DB.getById(patientId, formFields):

  1. FETCH PATIENT ROW
     - database.get("patients").find(patientId)

  2. MAP BASE FIELDS
     - For each field where baseField === true:
       - Convert field.column from snake_case to camelCase
         (e.g., "given_name" → "givenName")
       - Read value: patient[camelCaseColumn]
       - Store: patientRecord.values[field.id] = value

  3. FETCH ADDITIONAL ATTRIBUTES
     - Query patient_additional_attributes
       WHERE patient_id = patientId
       ORDER BY updated_at ASC
     - Sorted ASC so newer values overwrite older duplicates

  4. MAP DYNAMIC FIELDS
     - For each additional attribute row:
       - key = attribute.attributeId
       - Determine which column to read using getAdditionalFieldColumnName()
       - Read the appropriate column value
       - If duplicate attribute_id detected, warn and overwrite (last wins)
       - Store: patientRecord.values[key] = value

  5. RETURN { fields: formFields, values: mergedValues }
```

### 5.2 Get Patient by Government ID

Same flow as getById but:
- Query: `WHERE government_id = govtId`
- Multiple matches trigger a warning (should be unique)
- Uses the first result
- Additional attributes queried by `government_id` (not `patient_id`)

### 5.3 Convert DB Model to Domain Object

```
Patient.DB.fromDB(dbPatient) → Patient.T:
  - Direct field mapping (camelCase in code, snake_case in DB)
  - deletedAt wrapped in Option.fromNullable()
  - additionalData and metadata are JSON objects (already parsed by WatermelonDB's @json decorator)
```

---

## 6. Patient List Querying (Offline Mode)

### 6.1 Basic Name Search

```sql
-- For each word in search query:
SELECT * FROM patients
WHERE (
  given_name LIKE '%word%' OR surname LIKE '%word%'
)
AND is_deleted = 0
AND (
  primary_clinic_id IN (allowed_clinic_ids)
  OR primary_clinic_id IS NULL
)
ORDER BY updated_at DESC
LIMIT page_size * page_number
```

Search strings are sanitized with `extendedSanitizeLikeString()` which replaces non-alphanumeric chars (except Unicode letters/numbers) with underscores.

### 6.2 Advanced Search (Base Fields)

For each searchable base field with a user-provided value:

```
fieldType === "select" → LIKE 'value%'     (prefix match — prevents "female" matching "male")
fieldType === "text"   → LIKE '%value%'     (substring match)
fieldType === "number" → LIKE '%value%'     (substring match on string representation)
fieldType === "date"   → LIKE '%yyyy%'      (year-only matching)
```

### 6.3 Advanced Search (Dynamic Fields)

When searching dynamic (non-base) fields:

1. First query the `patients` table for name/base field matches
2. Then query `patient_additional_attributes`:
   ```sql
   SELECT * FROM patient_additional_attributes
   WHERE {type_column} LIKE '%value%'
     AND patient_id IN (patient_ids_from_step_1)
   ORDER BY updated_at
   LIMIT page_size * page_number
   ```
3. Intersect results: only return patients that appear in both result sets

### 6.4 Permission Filtering

All patient queries are filtered by clinic permissions:

```sql
WHERE (
  primary_clinic_id IN (
    SELECT clinic_id FROM user_clinic_permissions
    WHERE user_id = current_user_id
    AND can_view_history = 1
  )
  OR primary_clinic_id IS NULL
)
```

Patients with `NULL` primary_clinic_id are visible to all users.

### 6.5 Pagination

Uses cumulative pagination: `LIMIT page_size * page_number` (not OFFSET-based).
- Page 1: LIMIT 30
- Page 2: LIMIT 60
- Page 3: LIMIT 90

---

## 7. Government ID Uniqueness Check

```
Patient.DB.checkGovtIdExists(governmentId):
  - Query: SELECT * FROM patients WHERE government_id = ?
  - Returns true if any rows found
  - Used during registration with a 1000ms debounce
  - Prevents duplicate registration
```

---

## 8. Data Transformation for Sync / RPC

### 8.1 PatientRecord → CreatePatientInput (for online/RPC path)

```typescript
CreatePatientInput = {
  patient: {
    id?: string
    givenName, surname, dateOfBirth ("yyyy-MM-dd"),
    sex, phone, citizenship, photoUrl, camp, hometown,
    governmentId, externalPatientId,
    additionalData (JSON object), metadata (JSON object)
  },
  additionalAttributes: [
    {
      id: field.id,
      attributeId: field.id,
      patientId: "",        // Set by server
      attribute: field.column,
      value: record.values[field.id]  // Raw value (string|number|boolean|Date)
    }
    // ... one entry per dynamic field
  ]
}
```

### 8.2 For tRPC-style endpoints

Dynamic attributes are sent with typed value fields:

```typescript
TRPCPatientAttributeInput = {
  attribute_id: string,
  attribute: string,
  number_value?: number | null,
  string_value?: string | null,
  date_value?: string | null,    // ISO 8601
  boolean_value?: boolean | null,
  metadata?: Record<string, any>
}
```

The correct value field is populated based on the runtime type of the value:
- `typeof value === "number"` → `number_value`
- `typeof value === "boolean"` → `boolean_value`
- `value instanceof Date` → `date_value` (as ISO string)
- else → `string_value` (String coerced)

### 8.3 Server ↔ Domain Conversion (snake_case ↔ camelCase)

Server uses snake_case, app uses camelCase. Bidirectional mapping:

```
given_name         ↔ givenName
surname            ↔ surname
date_of_birth      ↔ dateOfBirth
photo_url          ↔ photoUrl
government_id      ↔ governmentId
external_patient_id ↔ externalPatientId
additional_data    ↔ additionalData
primary_clinic_id  ↔ primaryClinicId
last_modified_by   ↔ lastModifiedBy
is_deleted         ↔ isDeleted
deleted_at         ↔ deletedAt (Date ↔ ISO string, wrapped in Option)
created_at         ↔ createdAt (Date ↔ ISO string)
updated_at         ↔ updatedAt (Date ↔ ISO string)
```

---

## 9. Sync Considerations

### 9.1 WatermelonDB Sync Tracking

Every syncable table has `_status` and `_changed` columns:
- `_status = "created"` — new local record, not yet synced
- `_status = "updated"` — modified since last sync
- `_status = "deleted"` — marked for deletion, pending sync
- `_status = "synced"` — up to date with server
- `_changed` — CSV of column names that changed (e.g. `"given_name,phone"`)

### 9.2 Syncable Patient Tables

```
patients, patient_additional_attributes, visits, events,
patient_vitals, patient_problems, appointments
```

### 9.3 Conflict Resolution (Hub Sync)

Per-column merge strategy:

```
resolveConflict(localRecord, remoteRecord):
  1. Start with remote record as base
  2. Parse local._changed (CSV of changed field names)
  3. For each locally changed field, restore the local value
  4. Never resurrect deleted records
  Result: Server wins for unchanged fields, local wins for edited fields
```

### 9.4 Timestamp Handling During Sync

- `created_at`, `updated_at`, `deleted_at` — stored as Unix timestamps in milliseconds
- `date_of_birth` — stored as `"yyyy-MM-dd"` string (NOT a timestamp)
- JSON fields (`additional_data`, `metadata`, `fields`) — stringified during sync
- Invalid/missing timestamps fall back to current time

### 9.5 Batch Processing

Hub sync processes records in batches of 300 for performance.

---

## 10. Key Behavioral Requirements for Rust Hub Implementation

### 10.1 Registration Form as Schema Driver

The registration form defines what fields exist for patients. The Rust hub must:
- Parse the `registration_forms.fields` JSON to understand available fields
- Use the `baseField` flag to know which values are in `patients` columns vs `patient_additional_attributes`
- Use the `fieldType` to determine which value column to read/write in `patient_additional_attributes`

### 10.2 Atomic Operations

Patient create/update operations MUST be atomic:
- Patient row + all additional attribute rows written in a single transaction
- If any part fails, the entire operation rolls back

### 10.3 Soft Deletes are Universal

- Never hard-delete patient data in normal operations
- Set `is_deleted = 1` and `deleted_at = current_timestamp_ms`
- Cascading: deleting a patient must also soft-delete all related records (attributes, visits, events, appointments)

### 10.4 Permission Checks

Before any patient operation, verify:
- **Register**: User has `canRegisterPatients` for the target `primary_clinic_id`
- **Edit**: User has `canEditRecords` for the patient's `primary_clinic_id`
- **View**: User has `canViewHistory` for the patient's `primary_clinic_id` (or patient has NULL clinic)

### 10.5 Government ID Uniqueness

- `government_id` should be treated as a unique identifier
- Check for existing patients with the same ID before registration
- Multiple patients with the same government ID is an error condition (log warning)

### 10.6 Date of Birth Format

- Always stored as string `"yyyy-MM-dd"` in the `date_of_birth` column
- NOT stored as a timestamp
- Validate before storing: must be a valid date

### 10.7 Additional Data vs Additional Attributes

Two different mechanisms exist for extended patient data:
1. `patients.additional_data` — JSON blob for unstructured data (legacy/flexible)
2. `patient_additional_attributes` — Normalized table with typed columns (form-driven)

The registration form drives `patient_additional_attributes`. The `additional_data` JSON field is separate and used for other arbitrary data.

### 10.8 Search Implementation Requirements

The hub should support:
1. **Name search**: Case-insensitive LIKE on `given_name` and `surname`
2. **Base field search**: Direct column queries on `patients` table
3. **Dynamic field search**: Join/intersect with `patient_additional_attributes`
4. **Select field prefix matching**: Use `LIKE 'value%'` (not substring) to avoid false matches (e.g., "female" should not match "male")
5. **Permission filtering**: Always filter by clinic permissions
6. **Results sorted by `updated_at DESC`** by default

### 10.9 WatermelonDB Compatibility

Since the hub reads/writes the same SQLite database:
- Must set `_status` and `_changed` appropriately on writes
- New records: `_status = "created"`, `_changed = ""`
- Updated records: `_status = "updated"`, `_changed = "comma,separated,changed,columns"`
- Must not corrupt WatermelonDB's internal tracking
- UUIDs must be v7 format
- Timestamps must be Unix milliseconds (not seconds)

---

## 11. Complete SQL Schema Reference

```sql
CREATE TABLE patients (
  id TEXT PRIMARY KEY NOT NULL,
  given_name TEXT,
  surname TEXT,
  date_of_birth TEXT,
  citizenship TEXT,
  hometown TEXT,
  phone TEXT,
  sex TEXT,
  camp TEXT,
  photo_url TEXT,
  government_id TEXT,
  external_patient_id TEXT,
  additional_data TEXT,       -- JSON
  metadata TEXT,              -- JSON
  primary_clinic_id TEXT,
  last_modified_by TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  _status TEXT,
  _changed TEXT
);
CREATE INDEX patients_primary_clinic_id ON patients (primary_clinic_id);

CREATE TABLE patient_additional_attributes (
  id TEXT PRIMARY KEY NOT NULL,
  patient_id TEXT,
  attribute_id TEXT,
  attribute TEXT,
  number_value REAL,
  string_value TEXT,
  date_value INTEGER,
  boolean_value INTEGER,
  metadata TEXT,              -- JSON
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  _status TEXT,
  _changed TEXT
);
CREATE INDEX patient_additional_attributes_patient_id ON patient_additional_attributes (patient_id);
CREATE INDEX patient_additional_attributes_attribute_id ON patient_additional_attributes (attribute_id);

CREATE TABLE registration_forms (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  fields TEXT,                -- JSON array of RegistrationFormField
  metadata TEXT,              -- JSON
  is_deleted INTEGER DEFAULT 0,
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  _status TEXT,
  _changed TEXT
);
```

---

## 12. Example Walkthrough: Full Registration

**Scenario**: Register patient "Ahmad Hassan", male, born 1985-03-15, with a custom "Blood Type" field (select: A+, B+, O+, AB+).

**Registration form fields**:
```json
[
  { "id": "f1", "column": "given_name", "fieldType": "text", "baseField": true, ... },
  { "id": "f2", "column": "surname", "fieldType": "text", "baseField": true, ... },
  { "id": "f3", "column": "date_of_birth", "fieldType": "date", "baseField": true, ... },
  { "id": "f4", "column": "sex", "fieldType": "select", "baseField": true, "options": [{"en":"male"},{"en":"female"}], ... },
  { "id": "f5", "column": "blood_type", "fieldType": "select", "baseField": false, "options": [{"en":"A+"},{"en":"B+"},{"en":"O+"},{"en":"AB+"}], ... }
]
```

**Form values submitted**:
```json
{
  "f1": "Ahmad",
  "f2": "Hassan",
  "f3": "1985-03-15T00:00:00.000Z",
  "f4": "male",
  "f5": "B+"
}
```

**Database writes (single atomic transaction)**:

1. **INSERT into `patients`**:
```sql
INSERT INTO patients (id, given_name, surname, date_of_birth, sex, phone, citizenship,
  camp, hometown, photo_url, government_id, external_patient_id, additional_data,
  metadata, primary_clinic_id, last_modified_by, is_deleted, created_at, updated_at,
  _status, _changed)
VALUES ('01914a2b-...', 'Ahmad', 'Hassan', '1985-03-15', 'male', '', '',
  '', '', '', '', '', '{}',
  '{}', 'clinic-uuid', 'provider-uuid', 0, 1709136000000, 1709136000000,
  'created', '');
```

2. **INSERT into `patient_additional_attributes`** (only for `baseField === false`):
```sql
INSERT INTO patient_additional_attributes (id, patient_id, attribute_id, attribute,
  string_value, metadata, is_deleted, created_at, updated_at, _status, _changed)
VALUES ('01914a2c-...', '01914a2b-...', 'f5', 'blood_type',
  'B+', '{}', 0, 1709136000000, 1709136000000, 'created', '');
```

**Retrieval** (reconstructing PatientRecord for editing):

1. Fetch patient row → map base fields (f1→"Ahmad", f2→"Hassan", f3→"1985-03-15", f4→"male")
2. Fetch additional attributes WHERE patient_id = patient_id
3. For attribute with attribute_id="f5", fieldType="select" → read `string_value` → "B+"
4. Merge into values: `{ f1: "Ahmad", f2: "Hassan", f3: "1985-03-15", f4: "male", f5: "B+" }`
