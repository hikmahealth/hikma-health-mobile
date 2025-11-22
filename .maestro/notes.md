### Workflows

#### Register a new patient
Assuming the user is already logged in.

Steps:
1. On patient list page, click on "register patient"
2. Fill in the patient_form_input__{input-type}__{column}
3. Based on input type, select a value
4. Click save
5. Click Done in the pop up alert.
6. On home screen that user's name must be visible




#### Prescribe Medications - Comprehensive Test
**Status: ✅ Implemented** - Test file: `.maestro/flows/prescribe-medications.yaml`

This is a comprehensive test that includes multiple scenarios in a single flow:
- Scenario 1: Verify submit button is not visible without items (negative test)
- Scenario 2: Add and remove a prescription item
- Scenario 3: Add multiple prescription items and submit
- Scenario 4: Verify prescription appears in pharmacy

**Test Flow:**

**Scenario 1: Verify No Items - Negative Test**
1. Navigate to patients list and select first patient
2. Click on the medications button
3. Create new prescription
4. Add a note: "Maestro comprehensive test"
5. Verify no prescription items are present
6. Verify submit button is NOT visible (key negative test assertion)
7. Scroll and confirm submit button is not anywhere on screen

**Scenario 2: Add and Remove Item**
8. Open the "Add Prescription Item" modal (testID: `open-add-prescription-item-form`)
9. Wait for medication list to load (modal shows recommended drugs by default)
10. Select the first drug (testID: `inventory-item-${drugId}`, index: 0)
11. Verify prescription item is now visible
12. Verify submit button is now visible
13. Remove the prescription item (testID: `remove-prescription-item`)
14. Verify prescription item is gone
15. Verify submit button is hidden again

**Scenario 3: Add Multiple Items and Submit**
16. Add first prescription item (index: 0)
    - Set quantity (testID: `prescription-item-quantity`) to "10"
    - Set dosage instructions (testID: `prescription-item-instructions`) to "Take 2 tablets twice daily after meals"
17. Add second prescription item (index: 1)
18. Add third prescription item (index: 2)
19. Verify submit button is visible with multiple items
20. Submit the prescription (testID: `submit-prescription`)

**Scenario 4: Verify in Pharmacy**
21. Open the side nav menu (testID: `drawerButton`)
22. Navigate to Pharmacy
23. Verify the prescription is in the pharmacy list
24. Verify patient name is visible in pharmacy prescription
25. Verify prescription status is visible

**TestIDs Added to PrescriptionEditorFormScreen:**
- `prescription-notes` - Notes text field in PrescriptionEditorForm
- `prescription-item` - Each prescription item container
- `open-add-prescription-item-form` - Button to add new prescription item
- `clinic-inventory-search` - Search field for medications
- `inventory-item-${drugId}` - Each inventory item in search results (Pressable)
- `drug-brand-name-${drugId}` - Brand name in inventory item
- `drug-generic-name-${drugId}` - Generic name in inventory item
- `drug-form-route-${drugId}` - Form and route in inventory item
- `prescription-item-quantity` - Quantity input field
- `prescription-item-instructions` - Dosage instructions input field
- `remove-prescription-item` - Remove button for prescription item
- `submit-prescription` - Submit button for the prescription

**TestIDs Added to PharmacyViewScreen:**
- `pharmacy-search-prescriptions` - Search field in pharmacy
- `pharmacy-prescription-item-${prescriptionId}` - Each prescription item in pharmacy list (Pressable)
- `pharmacy-patient-name-${prescriptionId}` - Patient name in pharmacy prescription
- `pharmacy-prescription-status-${prescriptionId}` - Status badge container
- `pharmacy-prescription-status-text-${prescriptionId}` - Status text
- `pharmacy-prescription-drug-${drugId}` - Drug item in prescription
- `pharmacy-prescription-drug-name-${drugId}` - Drug name in prescription




Add patient vitals:
... TODO
