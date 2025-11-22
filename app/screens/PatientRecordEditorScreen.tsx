import { FC, useEffect, useMemo, useState } from "react"
import { Alert, Pressable, ViewStyle } from "react-native"
import { captureException } from "@sentry/react-native"
import { useSelector } from "@xstate/react"
import { format } from "date-fns"
import { Option } from "effect"
import { upperFirst } from "es-toolkit/compat"
import { LucideArrowRight } from "lucide-react-native"
import DropDownPicker from "react-native-dropdown-picker"

import { Button } from "@/components/Button"
import { DateOfBirthInput } from "@/components/DateOfBirthInput"
import { DatePickerButton } from "@/components/DatePicker"
import { If } from "@/components/If"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { Radio } from "@/components/Toggle/Radio"
import { View } from "@/components/View"
import { useClinics } from "@/hooks/useClinicsList"
import { useDebounce } from "@/hooks/useDebounce"
import { getBaseFieldByColumn, usePatientRecordEditor } from "@/hooks/usePatientRecordEditor"
import { useSimilarPatientsSearch } from "@/hooks/useSimilarPatientsSearch"
import { translate } from "@/i18n/translate"
import Patient from "@/models/Patient"
import { PatientStackScreenProps } from "@/navigators/PatientNavigator"
import { languageStore } from "@/store/language"
import { providerStore } from "@/store/provider"
import { colors } from "@/theme/colors"
import { parseYYYYMMDD } from "@/utils/date"
import { getTranslation } from "@/utils/parsers"
import UserClinicPermissions from "@/models/UserClinicPermissions"
// import { useNavigation } from "@react-navigation/native"

interface PatientRecordEditorScreenProps extends PatientStackScreenProps<"PatientRecordEditor"> {}

export const PatientRecordEditorScreen: FC<PatientRecordEditorScreenProps> = ({
  navigation,
  route,
}) => {
  const { language, isRTL } = useSelector(languageStore, (state) => state.context)
  const {
    id: providerId,
    clinic_id: clinicId,
    clinic_name: clinicName,
    name: providerName,
  } = useSelector(providerStore, (state) => state.context)
  const editPatientId = route?.params?.editPatientId

  const [existingGovtId, setExistingGovtId] = useState<boolean>(false)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clinics, isLoading: isLoadingClinics } = useClinics()
  const clinicOptionsList = clinics.map((clinic) => ({
    label: clinic.name,
    value: clinic.id,
  }))
  const {
    formFields,
    updateField,
    patientRecord,
    isLoading: isPatientRecordLoading,
  } = usePatientRecordEditor(editPatientId, language)

  // on mount, set the primary_clinic_id to the user's current clinic id (only for new patients or if not set);
  useEffect(() => {
    const primaryClinicFieldId = getBaseFieldByColumn("primary_clinic_id")

    if (primaryClinicFieldId && isPatientRecordLoading === false) {
      // Get the current value of the primary_clinic_id field
      const currentPrimaryClinicValue = patientRecord.values[primaryClinicFieldId.id]

      // Only set it if:
      // 1. We're creating a new patient (no editPatientId), OR
      // 2. The field is empty/undefined (patient doesn't have a primary clinic set)
      if (!editPatientId || !currentPrimaryClinicValue) {
        updateField(
          primaryClinicFieldId.id,
          Option.getOrElse(clinicId, () => ""),
        )
      }
    }
  }, [clinicId, isPatientRecordLoading, editPatientId])

  const { givenName, surname } = useMemo(() => {
    const givenName = Patient.getPatientFieldByName(patientRecord, "given_name", "") || ""
    const surname = Patient.getPatientFieldByName(patientRecord, "surname", "") || ""
    return { givenName, surname }
  }, [patientRecord.values])

  // Manage the state of whihch dropdown is open
  const [openDropdown, setOpenDropdown] = useState<"primary_clinic_id" | null>(null)

  /** Background patient search for similar existing patients */
  const similarPatients = useSimilarPatientsSearch(givenName, surname)

  /** Update nav title if there is a user we are updating */
  useEffect(() => {
    if (editPatientId && typeof editPatientId === "string" && editPatientId.length > 3) {
      navigation.setOptions({
        title: translate("newPatient:updatePatient"),
      })
    }
  }, [editPatientId])

  const govtId: string | undefined = useDebounce(
    (patientRecord.values[
      patientRecord.fields.find((field) => field.column === "government_id")?.id || ""
    ] as string) || "",
    1000,
  )

  /** on change of the government id, perform search to verify that the patient file does not exists */
  useEffect(() => {
    // get the government_id field id
    if (!govtId) return
    // if we are editing a patient, skip the check
    if (editPatientId && editPatientId.length > 0) {
      // TODO: check against incoming patientId
      return setExistingGovtId(false)
    }

    Patient.DB.checkGovtIdExists(govtId)
      .then((res) => {
        setExistingGovtId(res)
      })
      .catch((error) => {
        console.warn(error)
        setExistingGovtId(false)
      })
  }, [govtId])

  /** Navigate to the patient file */
  const openPatientFile = (id: string) => () => {
    if (id.length < 5) {
      console.error("Attempting to open a patient file with an invalid patient id")
      return
    }
    navigation.navigate("PatientView", {
      patientId: id,
    })
  }

  const onSubmit = async () => {
    if (existingGovtId) return
    // TODO: Confirm that all the required fields are filled in

    const provider = {
      id: providerId,
      name: providerName,
    }
    const clinic = {
      id: Option.getOrElse(clinicId, () => "Unknown"),
      name: Option.getOrElse(clinicName, () => "Unknown"),
    }
    const primaryClinicId =
      Patient.getPatientFieldByName(patientRecord, "primary_clinic_id", "") || clinic.id
    const viewHistoryClinicIds = await UserClinicPermissions.DB.getClinicIdsWithPermission(
      provider.id,
      "canEditRecords",
    )

    if (!viewHistoryClinicIds.includes(primaryClinicId)) {
      Alert.alert("Unauthorized", "You do not have permission to edit this patient's record.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ])
      return
    }

    let req
    if (editPatientId && editPatientId.length > 5) {
      // patient exists
      req = Patient.DB.updateById(editPatientId, patientRecord, provider, clinic)
    } else {
      req = Patient.DB.register(patientRecord, provider, clinic)
    }
    req
      .then((patientId) => {
        const redirectPatientId = patientId ?? editPatientId
        if (redirectPatientId === undefined) {
          // if there is no patient Id, there is no need to navigate elsewhere.
          return navigation.goBack()
        }
        Alert.alert(translate("common:success"), translate("newPatient:successfulSave"), [
          {
            text: translate("newPatient:done"),
            onPress: () => navigation.goBack(),
          },
          {
            text: translate("newPatient:continueToVisits"),
            onPress: () => {
              return navigation.replace("NewVisit", {
                patientId: redirectPatientId,
                visitDate: new Date().getTime(),
                visitId: null,
              })
            },
          },
        ])
      })
      .catch((error) => {
        console.error(error)
        // Report error to Sentry
        if (typeof captureException === "function") {
          captureException(error, {
            tags: {
              section: "patient_record_editor",
              action: editPatientId ? "update_patient" : "register_patient",
            },
            extra: {
              providerId,
              clinicId: Option.getOrElse(clinicId, () => "Unknown"),
              editPatientId,
              patientRecord: JSON.stringify(patientRecord.values),
            },
          })
        }
        Alert.alert(translate("common:error"), translate("newPatient:errorSaving"))
      })
  }

  const $rtl = isRTL ? $rtlStyle : {}

  return (
    <Screen style={$root} keyboardOffset={64} preset="scroll" safeAreaEdges={["bottom"]}>
      <View gap={10} pb={40}>
        {formFields
          .filter((field) => field.visible)
          .map((field) => {
            const { type, label, value } = field
            return (
              <View key={field.id}>
                {(type === "text" || type === "number") && field.column !== "primary_clinic_id" && (
                  <TextField
                    keyboardType={type === "number" ? "number-pad" : "default"}
                    value={String(value)}
                    onChangeText={(t) => updateField(field.id, type === "number" ? Number(t) : t)}
                    label={label}
                    testID={`patient_form_input__${field.type}__${field.column}`}
                    inputWrapperStyle={
                      field.column === "government_id" && existingGovtId
                        ? {
                            borderColor: colors.palette.angry500,
                          }
                        : {}
                    }
                  />
                )}
                <If condition={field.column === "government_id" && existingGovtId}>
                  <Text tx={"newPatient:govtIdExists"} />
                </If>

                <If condition={field.column === "primary_clinic_id"}>
                  <Text preset="formLabel" text={label} />
                  <DropDownPicker
                    open={openDropdown === field.column}
                    setOpen={(open) => {
                      if (open as unknown as boolean) setOpenDropdown(field.column as any)
                      else setOpenDropdown(null)
                    }}
                    testID={`patient_form_input__${field.type}__${field.column}`}
                    modalTitle="Primary Clinic"
                    style={$dropDownPickerStyle}
                    zIndex={990000}
                    zIndexInverse={990000}
                    listMode="MODAL"
                    items={clinicOptionsList}
                    value={value}
                    setValue={(cb) => {
                      const data = cb(value)
                      updateField(field.id, data)
                    }}
                  />
                </If>

                {type === "date" && field.column === "date_of_birth" && (
                  <View style={$rtl}>
                    <DateOfBirthInput
                      label={label}
                      testId={`patient_form_input__${field.type}__${field.column}`}
                      date={parseYYYYMMDD(value, new Date())}
                      onChangeDate={(d) => {
                        if (d && parseYYYYMMDD(d.toDateString(), undefined)) {
                          updateField(field.id, format(d, "yyyy-MM-dd"))
                        }
                      }}
                      ageEntryProps={{ day: 1, month: 0 }}
                    />
                  </View>
                )}

                {type === "date" && field.column !== "date_of_birth" && (
                  <View>
                    <View style={$rtl}>
                      <Text text={label} preset="formLabel" />
                    </View>
                    <View style={$rtl}>
                      <DatePickerButton
                        locale="en-US"
                        modal
                        testID={`patient_form_input__${field.type}__${field.column}`}
                        theme="light"
                        maximumDate={new Date()}
                        title={label}
                        date={parseYYYYMMDD(value, new Date())}
                        onDateChange={(d) =>
                          d &&
                          parseYYYYMMDD(d.toDateString(), undefined) &&
                          updateField(field.id, format(d, "yyyy-MM-dd"))
                        }
                      />
                    </View>
                  </View>
                )}

                {type === "select" && (
                  <View>
                    <View style={$rtl}>
                      <Text text={label} preset="formLabel" />
                    </View>
                    <View style={$rtl} gap={6} pt={6}>
                      {field.options.map((fieldOption) => (
                        <Radio
                          key={fieldOption.en}
                          label={upperFirst(getTranslation(fieldOption, language))}
                          value={value === getTranslation(fieldOption, language)}
                          onValueChange={(value) => {
                            if (value) {
                              updateField(field.id, getTranslation(fieldOption, language))
                            }
                          }}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )
          })}

        <If condition={similarPatients.length > 0 && typeof editPatientId !== "string"}>
          <View gap={8} style={$similarPatientsContainer}>
            <Text
              weight="semiBold"
              tx="newPatient:similarFoundPatients"
              style={$similarPatientsTitle}
            />
            {similarPatients.slice(0, 5).map((patient) => (
              <Pressable
                key={patient.id}
                onPress={openPatientFile(patient.id)}
                style={$patientPressable}
              >
                <View>
                  <Text text={`${patient.givenName} ${patient.surname}`} />
                  <Text text={`${translate("common:dob")}: ${patient.dateOfBirth}`} />
                </View>
                <LucideArrowRight color={colors.textDim} size={16} />
              </Pressable>
            ))}
          </View>
        </If>

        <Button
          preset="default"
          disabled={existingGovtId}
          onPress={() => onSubmit()}
          testID="submit"
        >
          {translate("common:save")}
        </Button>
      </View>

      <View style={$spacer} />
    </Screen>
  )
}

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 10,
}

const $similarPatientsContainer: ViewStyle = {
  backgroundColor: "#ffea99",
  borderRadius: 8,
  padding: 10,
}

const $similarPatientsTitle: ViewStyle = {
  marginBottom: 8,
}

const $patientPressable: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  borderBottomWidth: 1,
  borderBottomColor: "#7f6600",
  alignItems: "center",
}

const $spacer: ViewStyle = {
  height: 40,
}

const $rtlStyle: ViewStyle = { flexDirection: "row-reverse" }

const $dropDownPickerStyle: ViewStyle = {
  marginTop: 2,
  borderWidth: 1,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral400,
  zIndex: 990000,
  flex: 1,
}
