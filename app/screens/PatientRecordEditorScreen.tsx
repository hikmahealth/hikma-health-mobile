import React, { FC, useEffect, useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { Alert, Pressable, ViewStyle } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Button, If, Screen, Text, TextField, Toggle, View } from "app/components"
// import { useNavigation } from "@react-navigation/native"
import { useStores } from "app/models"
import { PatientRecord, TranslationObject } from "app/types"
import RegistrationFormModel, { RegistrationFormField } from "app/db/model/PatientRegistrationForm"
import database from "app/db"
import {
  getDefaultPatientRecord,
  getPatientFieldById,
  getPatientFieldByName,
} from "app/utils/patient"
import { patientApi } from "app/services/api/patientApi"
import { LucideArrowRight } from "lucide-react-native"
import { colors } from "app/theme"
import { translate } from "app/i18n"
import { upperFirst } from "lodash"
import { isValid } from "date-fns"
import { DatePickerButton } from "app/components/DatePicker"
import { getTranslation } from "app/utils/parsers"
import { useSimilarPatientsSearch } from "app/hooks/useSimilarPatientsSearch"
import { initialFormState } from "app/hooks/usePatientRegistrationForm"
import { usePatientRecordEditor } from "app/hooks/usePatientRecordEditor"
import { useDebounce } from "app/hooks/useDebounce"

interface PatientRecordEditorScreenProps extends AppStackScreenProps<"PatientRecordEditor"> {}

export const PatientRecordEditorScreen: FC<PatientRecordEditorScreenProps> = observer(
  function PatientRecordEditorScreen({ route, navigation }) {
    const { language } = useStores()
    const editPatientId = route?.params?.editPatientId
    const [existingGovtId, setExistingGovtId] = useState<boolean>(false)

    const { formFields, updateField, patientRecord } = usePatientRecordEditor(
      editPatientId,
      language.current,
    )

    const { givenName, surname } = useMemo(() => {
      const givenName = getPatientFieldByName(patientRecord, "given_name", "") || ""
      const surname = getPatientFieldByName(patientRecord, "surname", "") || ""
      return { givenName, surname }
    }, [patientRecord.values])

    const similarPatients = useSimilarPatientsSearch(givenName, surname)

    /** Update nav title if there is a user we are updating */
    useEffect(() => {
      if (editPatientId && typeof editPatientId === "string" && editPatientId.length > 3) {
        navigation.setOptions({
          title: translate("newPatient.updatePatient"),
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

      console.log({ govtId })

      patientApi
        .checkGovtIdExists(govtId)
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

    const onSubmit = () => {
      if (existingGovtId) return
      // TODO: Confirm that all the required fields are filled in

      let req
      if (editPatientId && editPatientId.length > 5) {
        // patient exists
        req = patientApi.updateById(editPatientId, patientRecord)
      } else {
        req = patientApi.register(patientRecord)
      }
      req
        .then((patientId) => {
          const redirectPatientId = patientId ?? editPatientId
          if (redirectPatientId === undefined) {
            // if there is no patient Id, there is no need to navigate elsewhere.
            return navigation.goBack()
          }
          Alert.alert("Success", "Patient saved", [
            {
              text: "Done",
              onPress: () => navigation.goBack(),
            },
            {
              text: "Continue to Visits",
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
          Alert.alert("Error", "An error occurred while saving the patient")
        })
    }
    const $rtl = language.isRTL ? $rtlStyle : {}

    return (
      <Screen style={$root} keyboardOffset={64} preset="scroll" safeAreaEdges={["bottom"]}>
        <View gap={10} pb={40}>
          {formFields
            .filter((field) => field.visible)
            .map((field) => {
              const { type, label, value } = field
              return (
                <View key={field.id}>
                  {(type === "text" || type === "number") && (
                    <TextField
                      keyboardType={type === "number" ? "number-pad" : "default"}
                      value={String(value)}
                      onChangeText={(t) => updateField(field.id, type === "number" ? Number(t) : t)}
                      label={label}
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
                    <Text text={"Government ID already registered"} />
                  </If>

                  {type === "date" && (
                    <View>
                      <View style={$rtl}>
                        <Text text={label} preset="formLabel" />
                      </View>
                      <View style={$rtl}>
                        <DatePickerButton
                          locale="en-US"
                          modal
                          theme="light"
                          title={label}
                          maximumDate={field.column === "date_of_birth" ? new Date() : undefined}
                          date={isValid(new Date(value)) ? new Date(value) : new Date()}
                          onDateChange={(d) => updateField(field.id, d)}
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
                          <Toggle
                            key={fieldOption.en}
                            label={upperFirst(getTranslation(fieldOption, language.current))}
                            value={value === getTranslation(fieldOption, language.current)}
                            onValueChange={(value) => {
                              if (value) {
                                updateField(field.id, getTranslation(fieldOption, language.current))
                              }
                            }}
                            variant="radio"
                          />
                        ))}
                        {/* <RadioButton.Group
                        onValueChange={(value: string) => setField(column, value)}
                        value={state[column]}
                      >
                        {field.options.map((option, idx) => (
                          <RadioButton.Item
                            key={idx}
                            style={$rtl}
                            color={colors.palette.primary500}
                            label={upperFirst(getTranslation(option, language.current))}
                            value={getTranslation(option, language.current)}
                          />
                        ))}
                      </RadioButton.Group> */}
                      </View>
                    </View>
                  )}
                </View>
              )
            })}

          <If condition={similarPatients.length > 0 && typeof editPatientId !== "string"}>
            <View
              gap={8}
              style={{
                backgroundColor: "#ffea99",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Text
                weight="semiBold"
                text="Similar Existing Patients"
                style={{ marginBottom: 8 }}
              />
              {similarPatients.slice(0, 5).map((patient) => (
                <Pressable
                  key={patient.id}
                  onPress={openPatientFile(patient.id)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    borderBottomWidth: 1,
                    borderBottomColor: "#7f6600",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text text={`${patient.givenName} ${patient.surname}`} />
                    <Text text={`${translate("dob")}: ${patient.dateOfBirth}`} />
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
            {translate("save")}
          </Button>
        </View>
        <View style={{ height: 40 }} />
      </Screen>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
  paddingHorizontal: 10,
}
const $rtlStyle: ViewStyle = { flexDirection: "row-reverse" }
