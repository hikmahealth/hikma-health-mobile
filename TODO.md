### Prescriptions

- [ ] When creating a new prescription, user must select a pick up location, the default looks selected but is not actually set



### MIGRATION FROM OLD APP
- [ ] On sign in, if the backend does not match the new backend, warn the user to update their backend to the new backend.



### Not Doing
#### If the old app has backend API url in mmkv or async storage or encrypted sotrage, migrate it to expo secure storage after pinging to check if it works
This is because the old app probably has the wrong backend API URL and we need to push all users to use the new backend and frontend.



### TESTS
- [ ] Component TESTS
  - [ ] TextField
  - [ ] Text
  - [ ] Screen
  - [ ] PatientListItem
  - [ ] Toggle Components
  - [ ] DignosisEditor
  - [ ] DateOfBirthInput
  - [ ] MedicationEditor
- [ ] Integration TESTS
